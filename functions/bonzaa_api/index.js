'use strict';

const catalyst = require('zcatalyst-sdk-node');
const crypto = require('crypto');

/*
 * Bonzaa Puppy Food Tracker — Advanced I/O API
 *
 * Tables (Data Store):
 *   Households      : Name, InviteCode(varchar, unique), HeadUserId(varchar)
 *   HouseholdMembers: HouseholdId(bigint), CatalystUserId(varchar, unique),
 *                     Email, DisplayName, Role('head'|'member')
 *   Puppies         : Name, Breed, BirthDate(date), PhotoUrl(text), Notes(text),
 *                     HouseholdId(bigint)
 *   FoodItems       : Name, Brand, FoodType, Notes(text), UsualPuppyId(bigint),
 *                     HouseholdId(bigint)
 *   FeedingLogs     : PuppyId(bigint), FoodItemId(bigint), Quantity(double), Unit,
 *                     MealSlot, FedAt(datetime 'YYYY-MM-DD HH:mm:ss'), FedBy,
 *                     IsNewFood(boolean), Notes(text)
 *   SymptomLogs     : PuppyId(bigint), Symptom, Severity, OnsetAt(datetime), Notes(text)
 *   RateLimits      : RLKey(varchar, unique), Count(bigint) — see checkRateLimit()
 *   RecentRemovals  : RRKey(varchar, unique), RemovedAtMs(bigint) — see markRecentlyRemoved()
 *   JoinRequests    : HouseholdId(bigint), CatalystUserId(varchar, unique), Email,
 *                     DisplayName — a join is a request, not a membership, until
 *                     the head approves it (see POST /household/join-requests/approve)
 *
 * A puppy, and everything under it, belongs to exactly one household. Every
 * data route is scoped to the caller's household — resolved once per request
 * from HouseholdMembers, keyed by the signed-in Catalyst user id — so one
 * family's sign-ins never see another family's puppies, foods, feedings, or
 * symptoms. FeedingLogs/SymptomLogs carry no HouseholdId of their own: they
 * are scoped transitively through the PuppyId they point at, which is
 * cheaper than denormalizing and just as strict, since every access to them
 * already requires a puppy_id.
 *
 * Datetimes are handled as 'YYYY-MM-DD HH:mm:ss' strings in the project
 * timezone throughout — string comparison keeps ordering correct and avoids
 * the CREATEDTIME/UTC parsing pitfall.
 */

// Symptom onset window: food eaten between 2h and 48h before onset is suspect.
const SUSPECT_WINDOW_MIN_HOURS = 2;
const SUSPECT_WINDOW_MAX_HOURS = 48;
const BASELINE_DAYS = 14; // frequency baseline for down-weighting everyday foods

// Console > Notify > Push Notifications > Android > Android Configuration ID.
// Both registerNotification() on the client and pushNotification().mobile()
// here key off this same id — it identifies the push channel, not the
// Firebase project or the Catalyst project itself.
const PUSH_APP_ID = '5433000043323270';

const MAX_BODY_BYTES = 100 * 1024; // generous for our small JSON payloads incl. free-text notes

class ApiError extends Error {
	constructor(httpStatus, body) {
		super(typeof body === 'string' ? body : body.error);
		this.httpStatus = httpStatus;
		this.body = typeof body === 'string' ? { error: body } : body;
	}
}

function sendJson(res, statusCode, data) {
	// no-store: responses carry another family's-worth-adjacent puppy/health data —
	// never worth letting a shared device or intermediary cache it.
	res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
	res.end(JSON.stringify(data));
}

function getBody(req) {
	return new Promise((resolve, reject) => {
		if (req.body && typeof req.body === 'object') return resolve(req.body);
		if (req.body && typeof req.body === 'string') {
			try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve({}); }
		}
		let data = '';
		let bytes = 0;
		req.on('data', (chunk) => {
			bytes += chunk.length;
			if (bytes > MAX_BODY_BYTES) {
				req.destroy();
				reject(new ApiError(413, 'Request body too large'));
				return;
			}
			data += chunk;
		});
		req.on('end', () => {
			try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
		});
		req.on('error', reject);
	});
}

function unwrapZcql(result, tableName) {
	return result.map((r) => r[tableName]).filter(Boolean);
}

function toBool(v) {
	return v === 'true' || v === true;
}

function esc(s) {
	return String(s).replace(/'/g, "''");
}

// 'YYYY-MM-DD HH:mm:ss' shifted by +/- hours, still in project-local wall time
function shiftDatetime(dtString, hours) {
	const d = new Date(dtString.replace(' ', 'T') + 'Z'); // treat as UTC just for arithmetic
	d.setTime(d.getTime() + hours * 3600 * 1000);
	return d.toISOString().slice(0, 19).replace('T', ' ');
}

function isValidDatetime(s) {
	const m = typeof s === 'string' && /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
	if (!m) return false;
	const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
	const hour = Number(m[4]), minute = Number(m[5]), second = m[6] ? Number(m[6]) : 0;
	if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
	// Round-trip through Date to catch calendar-impossible values the regex lets through
	// (Feb 30, day 32, ...) — Date normalizes overflow instead of rejecting it.
	const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
	return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function randomInviteCode() {
	// Avoids 0/O/1/I so a family reading it aloud (or squinting at a phone) never confuses characters.
	// crypto.randomInt, not Math.random: this code is effectively a bearer credential
	// for joining a household, so it needs to be unguessable, not just look random.
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let out = '';
	for (let i = 0; i < 8; i++) out += alphabet[crypto.randomInt(alphabet.length)];
	return out;
}

async function generateUniqueInviteCode(app) {
	const zcql = app.zcql();
	// Collisions are astronomically unlikely at this scale, but retry rather than trust it blindly.
	for (let attempt = 0; attempt < 5; attempt++) {
		const candidate = randomInviteCode();
		const clash = await zcqlOne(zcql, `SELECT ROWID FROM Households WHERE InviteCode = '${candidate}'`, 'Households');
		if (!clash) return candidate;
	}
	return null;
}

async function zcqlAll(zcql, baseQuery, tableName) {
	// ZCQL hard limit: 300 rows/query — paginate until short page.
	const PAGE = 300;
	let offset = 0;
	let all = [];
	for (;;) {
		const batch = await zcql.executeZCQLQuery(`${baseQuery} LIMIT ${offset}, ${PAGE}`);
		const rows = unwrapZcql(batch, tableName);
		all = all.concat(rows);
		if (rows.length < PAGE) break;
		offset += PAGE;
	}
	return all;
}

async function zcqlOne(zcql, baseQuery, tableName) {
	const rows = await zcqlAll(zcql, baseQuery, tableName);
	return rows[0] || null;
}

/* ---------- rate limiting ---------- */
// Per-user, per-hour caps on the two routes that fan out a push per call —
// stops rapid leave/rejoin spamming "joined your family", and rapid-fire
// symptom logging spamming everyone else's phone. Backed by a Data Store
// table (RateLimits: RLKey unique, Count), not Catalyst Cache: an earlier
// version used Cache's getValue()-then-update(), which is two separate
// round trips from our own code — a burst of concurrent requests can all
// read the same "under limit" count before any of them writes back the
// increment (confirmed live: 30 concurrent requests, all accepted, final
// stored count "1"). The fix is doing the check and the increment as ONE
// statement the database evaluates atomically, not two we sequence
// ourselves: `UPDATE ... SET Count = Count + 1 WHERE RLKey = ? AND Count
// < ?` returns the updated row when it was still under the cap, and an
// empty result when it wasn't — confirmed live against this project's own
// Data Store. The hour is baked into RLKey itself (rather than tracked in
// a WindowStart column) so a new hour just means a new key, with no
// separate reset step to race on.
async function checkRateLimit(app, bucket, userId, maxPerHour) {
	try {
		const zcql = app.zcql();
		const hourBucket = new Date().toISOString().slice(0, 13); // e.g. "2026-09-05T00"
		const key = `${bucket}:${userId}:${hourBucket}`;

		const incremented = await zcqlOne(
			zcql,
			`UPDATE RateLimits SET Count = Count + 1 WHERE RLKey = '${esc(key)}' AND Count < ${Number(maxPerHour)}`,
			'RateLimits'
		);
		if (incremented) return; // was under the cap, and the increment already landed

		const existing = await zcqlOne(zcql, `SELECT ROWID FROM RateLimits WHERE RLKey = '${esc(key)}'`, 'RateLimits');
		if (existing) {
			throw new ApiError(429, { error: 'Too many requests — please wait a bit before trying again' });
		}
		// No row yet — this looks like the first request of a fresh hour. RLKey
		// is unique, so if we win the insert we ARE that first request (Count=1,
		// allowed). But a burst of concurrent "first" requests all land here
		// simultaneously, and only one of them can win — the naive version of
		// this treated every LOSER as free too (confirmed live: 30 concurrent
		// first-of-the-hour requests, all accepted, final stored count "1").
		// A loser isn't free: it has to go back and take the atomic increment
		// path against the row the winner just created, same as any other
		// request arriving after the first — that's what actually enforces the
		// cap across the burst instead of only after it.
		try {
			await app.datastore().table('RateLimits').insertRow({ RLKey: key, Count: 1 });
			return; // we won — we're this hour's 1st, allowed
		} catch (e) {
			const retryIncremented = await zcqlOne(
				zcql,
				`UPDATE RateLimits SET Count = Count + 1 WHERE RLKey = '${esc(key)}' AND Count < ${Number(maxPerHour)}`,
				'RateLimits'
			);
			if (retryIncremented) return;
			throw new ApiError(429, { error: 'Too many requests — please wait a bit before trying again' });
		}
	} catch (e) {
		if (e instanceof ApiError) throw e;
		// Data Store hiccup: fail open rather than lock a family out of the app over it.
		console.error('rate limit check failed, allowing request:', e.message || e);
	}
}

/* ---------- recent-removal denylist ---------- */
// DELETE /household/members rotates the invite code before deleting the
// membership specifically so the OLD code dies before removal takes effect —
// but the removed member is still, technically, a member for the instant
// between those two writes, and a GET /household in that instant would hand
// them the brand-new code. There's no cross-table transaction available to
// make "rotate + delete" a single atomic step, so this closes the gap from
// the other side instead: record that this (household, user) pair was just
// removed, and refuse a join on this household from that exact user for a
// short window afterward — regardless of which code, old or new, they
// present. RRKey is unique, so a concurrent removal+immediate-rejoin can't
// race past this the way the invite code itself could.
const RECENT_REMOVAL_WINDOW_MS = 60 * 1000;

async function markRecentlyRemoved(app, householdId, userId) {
	const key = `${householdId}:${userId}`;
	const zcql = app.zcql();
	const existing = await zcqlOne(zcql, `SELECT ROWID FROM RecentRemovals WHERE RRKey = '${esc(key)}'`, 'RecentRemovals');
	if (existing) {
		await app.datastore().table('RecentRemovals').updateRow({ ROWID: Number(existing.ROWID), RemovedAtMs: Date.now() });
	} else {
		await app.datastore().table('RecentRemovals').insertRow({ RRKey: key, RemovedAtMs: Date.now() });
	}
}

async function wasRecentlyRemoved(app, householdId, userId) {
	const key = `${householdId}:${userId}`;
	const row = await zcqlOne(app.zcql(), `SELECT RemovedAtMs FROM RecentRemovals WHERE RRKey = '${esc(key)}'`, 'RecentRemovals');
	if (!row) return false;
	return Date.now() - Number(row.RemovedAtMs) < RECENT_REMOVAL_WINDOW_MS;
}

/* ---------- household membership ---------- */

async function getMembership(app, catalystUserId) {
	const zcql = app.zcql();
	const membership = await zcqlOne(
		zcql,
		`SELECT ROWID, HouseholdId, Role FROM HouseholdMembers WHERE CatalystUserId = '${esc(catalystUserId)}'`,
		'HouseholdMembers'
	);
	if (!membership) return null;
	const household = await zcqlOne(
		zcql,
		`SELECT ROWID, Name, InviteCode, HeadUserId FROM Households WHERE ROWID = ${Number(membership.HouseholdId)}`,
		'Households'
	);
	if (!household) return null;
	// is_head is derived from Households.HeadUserId, NOT HouseholdMembers.Role —
	// Role is a denormalized display copy, kept in sync on transfer, but
	// HeadUserId is the single authoritative value every permission check
	// gates on. This matters: a concurrency bug in transfer-head could earlier
	// leave two HouseholdMembers rows both marked Role='head' after a race
	// (confirmed live) — trusting Role directly meant BOTH of those users
	// would pass is_head checks. HeadUserId is written by exactly one atomic
	// conditional UPDATE per transfer (see 'POST /household/transfer-head'),
	// so it can never itself end up pointing at two people.
	const isHead = String(household.HeadUserId) === String(catalystUserId);
	return {
		id: Number(household.ROWID),
		name: household.Name,
		invite_code: household.InviteCode,
		head_user_id: String(household.HeadUserId),
		is_head: isHead,
		role: isHead ? 'head' : 'member'
	};
}

// A user can have at most one outstanding join request at a time — same
// invariant as membership itself, and enforced the same way (CatalystUserId
// unique on JoinRequests, same as on HouseholdMembers).
async function getPendingJoinRequest(app, catalystUserId) {
	const row = await zcqlOne(
		app.zcql(),
		`SELECT HouseholdId, CREATEDTIME FROM JoinRequests WHERE CatalystUserId = '${esc(catalystUserId)}'`,
		'JoinRequests'
	);
	if (!row) return null;
	const household = await zcqlOne(
		app.zcql(),
		`SELECT Name FROM Households WHERE ROWID = ${Number(row.HouseholdId)}`,
		'Households'
	);
	return { household_name: household ? household.Name : null, requested_at: row.CREATEDTIME };
}

// Every data route (everything but /health and /household*) needs a household.
// Thrown as a typed error so the dispatcher can tell the client to onboard
// rather than treating it as a server fault.
function requireHousehold(household) {
	if (!household) {
		throw new ApiError(409, { error: 'no_household', message: 'Join or create a family first.' });
	}
	return household;
}

async function assertPuppyInHousehold(app, puppyId, householdId) {
	const zcql = app.zcql();
	const puppy = await zcqlOne(
		zcql,
		`SELECT ROWID, HouseholdId FROM Puppies WHERE ROWID = ${Number(puppyId)}`,
		'Puppies'
	);
	if (!puppy) throw new ApiError(404, 'Puppy not found');
	if (Number(puppy.HouseholdId) !== householdId) {
		throw new ApiError(403, 'This puppy belongs to a different family');
	}
}

async function assertRowInHousehold(app, tableName, rowId, householdId) {
	const zcql = app.zcql();
	const row = await zcqlOne(
		zcql,
		`SELECT ROWID, HouseholdId FROM ${tableName} WHERE ROWID = ${Number(rowId)}`,
		tableName
	);
	if (!row) throw new ApiError(404, 'Not found');
	if (Number(row.HouseholdId) !== householdId) {
		throw new ApiError(403, 'This belongs to a different family');
	}
}

/* ---------- family activity push ---------- */
// Real-time push, not a database record: nothing here is queryable by the
// clients, it only reaches whichever devices already called
// ZCatalystApp.registerNotification() while signed in. Delivery failures
// (unregistered device, revoked token) are swallowed per-recipient so one
// stale phone in the family never breaks the symptom log for everyone else.

async function pushToHouseholdMembers(app, householdId, excludeUserId, message, additionalInfo) {
	const zcql = app.zcql();
	const others = await zcqlAll(
		zcql,
		`SELECT CatalystUserId FROM HouseholdMembers WHERE HouseholdId = ${Number(householdId)} ` +
		`AND CatalystUserId != '${esc(String(excludeUserId))}'`,
		'HouseholdMembers'
	);
	if (!others.length) return;

	const mobile = app.pushNotification().mobile(PUSH_APP_ID);
	await Promise.all(others.map((m) =>
		mobile.sendAndroidNotification(
			{ message, additional_info: additionalInfo },
			m.CatalystUserId
		).catch((e) => console.error('push failed for', m.CatalystUserId, e.message || e))
	));
}

// Push messages are deliberately generic — who, what symptom, and how severe
// all stay inside the app, fetched over the authenticated API once someone
// opens it, rather than riding in the FCM payload. FCM is TLS-encrypted
// point-to-point, not end-to-end: Google's own infrastructure sees the
// plaintext body it's routing, so a family member's name and a pet's
// symptom/severity don't belong in it. additional_info carries only the
// opaque ids the client needs to deep-link to the right screen.

async function notifyHouseholdOfSymptom(app, ctx, puppyId) {
	await pushToHouseholdMembers(app, ctx.household.id, ctx.user.user_id, '🐾 A symptom was logged — open Bonzaa for details', {
		type: 'symptom_logged', puppy_id: String(puppyId)
	});
}

async function notifyHouseholdOfNewMember(app, householdId, newUser) {
	await pushToHouseholdMembers(app, householdId, newUser.user_id, '👨‍👩‍👧 Someone joined your family on Bonzaa', {
		type: 'member_joined'
	});
}

// The requester isn't a HouseholdMembers row yet, so pushToHouseholdMembers
// (which only targets existing members) can't reach them — send straight to
// the head's own user id instead.
async function notifyHeadOfJoinRequest(app, headUserId) {
	await app.pushNotification().mobile(PUSH_APP_ID).sendAndroidNotification(
		{ message: '🔔 Someone wants to join your family — open Bonzaa to review', additional_info: { type: 'join_requested' } },
		headUserId
	).catch((e) => console.error('push failed for head', headUserId, e.message || e));
}

async function notifyRequesterOfDecision(app, catalystUserId, approved) {
	const message = approved
		? '🎉 You were approved to join your family — open Bonzaa to get started'
		: '🚫 Your request to join a family on Bonzaa was declined';
	await app.pushNotification().mobile(PUSH_APP_ID).sendAndroidNotification(
		{ message, additional_info: { type: approved ? 'join_approved' : 'join_declined' } },
		catalystUserId
	).catch((e) => console.error('push failed for requester', catalystUserId, e.message || e));
}

/* ---------- suspect scoring ---------- */

async function computeSuspects(app, puppyId, onsetAt) {
	const zcql = app.zcql();
	const windowStart = shiftDatetime(onsetAt, -SUSPECT_WINDOW_MAX_HOURS);
	const windowEnd = shiftDatetime(onsetAt, -SUSPECT_WINDOW_MIN_HOURS);
	const baselineStart = shiftDatetime(onsetAt, -BASELINE_DAYS * 24);

	// Feedings inside the suspect window for this incident
	const windowFeedings = await zcqlAll(
		zcql,
		`SELECT ROWID, FoodItemId, FedAt, IsNewFood, MealSlot, Quantity, Unit FROM FeedingLogs ` +
		`WHERE PuppyId = ${Number(puppyId)} AND FedAt >= '${esc(windowStart)}' AND FedAt <= '${esc(windowEnd)}' ` +
		`ORDER BY FedAt DESC`,
		'FeedingLogs'
	);
	if (windowFeedings.length === 0) {
		return { window_start: windowStart, window_end: windowEnd, suspects: [] };
	}

	// Baseline frequency: how often has each food been fed in the last 14 days
	const baselineFeedings = await zcqlAll(
		zcql,
		`SELECT FoodItemId FROM FeedingLogs ` +
		`WHERE PuppyId = ${Number(puppyId)} AND FedAt >= '${esc(baselineStart)}' AND FedAt <= '${esc(onsetAt)}'`,
		'FeedingLogs'
	);
	const baselineCount = {};
	for (const f of baselineFeedings) {
		baselineCount[f.FoodItemId] = (baselineCount[f.FoodItemId] || 0) + 1;
	}

	// Prior incidents for this puppy (to reward foods that precede multiple incidents)
	const priorSymptoms = await zcqlAll(
		zcql,
		`SELECT ROWID, OnsetAt FROM SymptomLogs WHERE PuppyId = ${Number(puppyId)} AND OnsetAt < '${esc(onsetAt)}'`,
		'SymptomLogs'
	);

	const priorIncidentFoods = {}; // FoodItemId -> count of distinct prior incidents preceded by it
	for (const s of priorSymptoms) {
		if (!isValidDatetime(s.OnsetAt)) continue;
		const ws = shiftDatetime(s.OnsetAt, -SUSPECT_WINDOW_MAX_HOURS);
		const we = shiftDatetime(s.OnsetAt, -SUSPECT_WINDOW_MIN_HOURS);
		const rows = await zcqlAll(
			zcql,
			`SELECT DISTINCT FoodItemId FROM FeedingLogs ` +
			`WHERE PuppyId = ${Number(puppyId)} AND FedAt >= '${esc(ws)}' AND FedAt <= '${esc(we)}'`,
			'FeedingLogs'
		);
		for (const r of rows) {
			priorIncidentFoods[r.FoodItemId] = (priorIncidentFoods[r.FoodItemId] || 0) + 1;
		}
	}

	// Score each food seen in this incident's window
	const byFood = {};
	for (const f of windowFeedings) {
		const id = f.FoodItemId;
		if (!byFood[id]) byFood[id] = { feedings: [], newFood: false };
		byFood[id].feedings.push(f);
		if (toBool(f.IsNewFood)) byFood[id].newFood = true;
	}

	const foodIds = Object.keys(byFood);
	const foods = foodIds.length
		? await zcqlAll(
			zcql,
			`SELECT ROWID, Name, Brand, FoodType FROM FoodItems WHERE ROWID IN (${foodIds.map(Number).join(',')})`,
			'FoodItems'
		)
		: [];
	const foodMeta = {};
	for (const f of foods) foodMeta[f.ROWID] = f;

	const suspects = foodIds.map((id) => {
		const info = byFood[id];
		let score = info.feedings.length; // 1 point per feeding in window
		if (info.newFood) score += 3; // new foods are prime suspects
		const priorHits = priorIncidentFoods[id] || 0;
		score += priorHits * 2; // repeated across incidents
		const freq = baselineCount[id] || info.feedings.length;
		score = score / Math.sqrt(freq); // everyday staples get down-weighted
		return {
			food_item_id: id,
			name: foodMeta[id] ? foodMeta[id].Name : 'Unknown food',
			brand: foodMeta[id] ? foodMeta[id].Brand : null,
			food_type: foodMeta[id] ? foodMeta[id].FoodType : null,
			score: Math.round(score * 100) / 100,
			feedings_in_window: info.feedings.map((f) => ({
				fed_at: f.FedAt, meal_slot: f.MealSlot, quantity: f.Quantity, unit: f.Unit
			})),
			was_new_food: info.newFood,
			preceded_prior_incidents: priorHits,
			fed_times_in_last_14_days: baselineCount[id] || 0
		};
	}).sort((a, b) => b.score - a.score);

	return {
		window_start: windowStart,
		window_end: windowEnd,
		note: 'Correlation aid only — confirm with a veterinarian.',
		suspects
	};
}

/* ---------- route handlers ---------- */
// Each handler receives (app, req, res, query, ctx) where ctx = { user, household }.
// household is null only on the /household* routes; every other route is
// pre-gated by the dispatcher via requireHousehold(), so ctx.household is
// guaranteed there.

const routes = {
	'GET /health': async (app, req, res) => {
		sendJson(res, 200, { status: 'ok', service: 'bonzaa_api' });
	},

	/* ---- household ---- */

	'GET /household': async (app, req, res, query, ctx) => {
		if (!ctx.household) {
			const pending = await getPendingJoinRequest(app, String(ctx.user.user_id));
			return sendJson(res, 200, { household: null, members: [], your_user_id: String(ctx.user.user_id), pending_request: pending });
		}
		const zcql = app.zcql();
		const memberRows = await zcqlAll(
			zcql,
			`SELECT CatalystUserId, Email, DisplayName, CREATEDTIME FROM HouseholdMembers ` +
			`WHERE HouseholdId = ${ctx.household.id} ORDER BY CREATEDTIME`,
			'HouseholdMembers'
		);
		// Only the head sees who's asking to join — nobody else needs to.
		const joinRequests = ctx.household.is_head
			? await zcqlAll(
					zcql,
					`SELECT CatalystUserId, Email, DisplayName, CREATEDTIME FROM JoinRequests WHERE HouseholdId = ${ctx.household.id} ORDER BY CREATEDTIME`,
					'JoinRequests'
				)
			: [];
		sendJson(res, 200, {
			household: ctx.household,
			your_user_id: String(ctx.user.user_id),
			members: memberRows.map((m) => ({
				user_id: m.CatalystUserId,
				email: m.Email,
				display_name: m.DisplayName,
				// Derived from Households.HeadUserId (ctx.household.head_user_id),
				// the single source of truth — see getMembership().
				role: m.CatalystUserId === ctx.household.head_user_id ? 'head' : 'member',
				joined_at: m.CREATEDTIME
			})),
			join_requests: joinRequests.map((r) => ({
				user_id: r.CatalystUserId,
				email: r.Email,
				display_name: r.DisplayName,
				requested_at: r.CREATEDTIME
			}))
		});
	},

	'POST /household': async (app, req, res, query, ctx) => {
		if (ctx.household) return sendJson(res, 409, { error: 'You already belong to a family' });
		const body = await getBody(req);
		if (!body.name) return sendJson(res, 400, { error: 'name is required' });
		const inviteCode = await generateUniqueInviteCode(app);
		if (!inviteCode) return sendJson(res, 500, { error: 'Could not allocate an invite code, try again' });

		const household = await app.datastore().table('Households').insertRow({
			Name: body.name,
			InviteCode: inviteCode,
			HeadUserId: String(ctx.user.user_id)
		});
		await app.datastore().table('HouseholdMembers').insertRow({
			HouseholdId: Number(household.ROWID),
			CatalystUserId: String(ctx.user.user_id),
			Email: ctx.user.email_id || '',
			DisplayName: [ctx.user.first_name, ctx.user.last_name].filter(Boolean).join(' ') || ctx.user.email_id || '',
			Role: 'head'
		});
		sendJson(res, 201, {
			household: { id: Number(household.ROWID), name: household.Name, invite_code: household.InviteCode, is_head: true, role: 'head' }
		});
	},

	// A code gets someone as far as a REQUEST, never straight to membership —
	// the head still has to approve it. A rotate-on-removal + short denylist
	// (see markRecentlyRemoved) can't fully close this on its own: the removed
	// member typically already knows the CURRENT code (every member can see
	// it), and no amount of blocking-by-CatalystUserId stops the same person
	// from signing up under a different Catalyst account and presenting the
	// same leaked code fresh — a new account is a new identity as far as the
	// system can tell. Approval is the actual gate: someone who recognizes the
	// requester (by name/email, shown to the head) decides, not a secret string.
	'POST /household/join': async (app, req, res, query, ctx) => {
		if (ctx.household) return sendJson(res, 409, { error: 'You already belong to a family' });
		await checkRateLimit(app, 'join', ctx.user.user_id, 5);
		const body = await getBody(req);
		const code = (body.invite_code || '').trim().toUpperCase();
		if (!code) return sendJson(res, 400, { error: 'invite_code is required' });
		const zcql = app.zcql();
		const household = await zcqlOne(zcql, `SELECT ROWID, Name, InviteCode, HeadUserId FROM Households WHERE InviteCode = '${esc(code)}'`, 'Households');
		if (!household) return sendJson(res, 404, { error: 'No family found with that invite code' });
		// Same response as an unknown code — no reason to tell a just-removed
		// user WHY it didn't work, only that it didn't.
		if (await wasRecentlyRemoved(app, Number(household.ROWID), ctx.user.user_id)) {
			return sendJson(res, 404, { error: 'No family found with that invite code' });
		}
		if (await getPendingJoinRequest(app, String(ctx.user.user_id))) {
			return sendJson(res, 409, { error: 'You already have a pending request to join a family' });
		}

		try {
			await app.datastore().table('JoinRequests').insertRow({
				HouseholdId: Number(household.ROWID),
				CatalystUserId: String(ctx.user.user_id),
				Email: ctx.user.email_id || '',
				DisplayName: [ctx.user.first_name, ctx.user.last_name].filter(Boolean).join(' ') || ctx.user.email_id || ''
			});
		} catch (e) {
			// CatalystUserId is unique — a concurrent duplicate request lands here.
			return sendJson(res, 409, { error: 'You already have a pending request to join a family' });
		}
		sendJson(res, 202, { pending: true, household_name: household.Name });
		await notifyHeadOfJoinRequest(app, household.HeadUserId)
			.catch((e) => console.error('notifyHeadOfJoinRequest failed:', e));
	},

	// Exempt from requireHousehold — for someone who has no household precisely
	// because they're still waiting on this request to be decided.
	'POST /household/join-requests/cancel': async (app, req, res, query, ctx) => {
		const request = await zcqlOne(
			app.zcql(),
			`SELECT ROWID FROM JoinRequests WHERE CatalystUserId = '${esc(String(ctx.user.user_id))}'`,
			'JoinRequests'
		);
		if (request) await app.datastore().table('JoinRequests').deleteRow(Number(request.ROWID));
		sendJson(res, 200, { cancelled: true });
	},

	'POST /household/join-requests/approve': async (app, req, res, query, ctx) => {
		if (!ctx.household.is_head) return sendJson(res, 403, { error: 'Only the head of the family can approve join requests' });
		const body = await getBody(req);
		const targetUserId = (body.user_id || '').toString().trim();
		if (!targetUserId) return sendJson(res, 400, { error: 'user_id is required' });
		const zcql = app.zcql();
		const request = await zcqlOne(
			zcql,
			`SELECT ROWID, HouseholdId, Email, DisplayName FROM JoinRequests WHERE CatalystUserId = '${esc(targetUserId)}'`,
			'JoinRequests'
		);
		if (!request || Number(request.HouseholdId) !== ctx.household.id) {
			return sendJson(res, 404, { error: 'No pending request from that user' });
		}
		await app.datastore().table('HouseholdMembers').insertRow({
			HouseholdId: ctx.household.id,
			CatalystUserId: targetUserId,
			Email: request.Email,
			DisplayName: request.DisplayName,
			Role: 'member'
		});
		await app.datastore().table('JoinRequests').deleteRow(Number(request.ROWID));
		sendJson(res, 200, { approved: targetUserId });
		await notifyRequesterOfDecision(app, targetUserId, true).catch((e) => console.error('notify approve failed:', e));
		await notifyHouseholdOfNewMember(app, ctx.household.id, { user_id: targetUserId })
			.catch((e) => console.error('notifyHouseholdOfNewMember failed:', e));
	},

	'POST /household/join-requests/decline': async (app, req, res, query, ctx) => {
		if (!ctx.household.is_head) return sendJson(res, 403, { error: 'Only the head of the family can decline join requests' });
		const body = await getBody(req);
		const targetUserId = (body.user_id || '').toString().trim();
		if (!targetUserId) return sendJson(res, 400, { error: 'user_id is required' });
		const request = await zcqlOne(
			app.zcql(),
			`SELECT ROWID, HouseholdId FROM JoinRequests WHERE CatalystUserId = '${esc(targetUserId)}'`,
			'JoinRequests'
		);
		if (!request || Number(request.HouseholdId) !== ctx.household.id) {
			return sendJson(res, 404, { error: 'No pending request from that user' });
		}
		await app.datastore().table('JoinRequests').deleteRow(Number(request.ROWID));
		sendJson(res, 200, { declined: targetUserId });
		await notifyRequesterOfDecision(app, targetUserId, false).catch((e) => console.error('notify decline failed:', e));
	},

	'POST /household/leave': async (app, req, res, query, ctx) => {
		if (!ctx.household) return sendJson(res, 409, { error: 'no_household', message: 'You are not in a family' });
		const zcql = app.zcql();
		if (ctx.household.is_head) {
			const others = await zcqlOne(
				zcql,
				`SELECT ROWID FROM HouseholdMembers WHERE HouseholdId = ${ctx.household.id} AND CatalystUserId != '${esc(String(ctx.user.user_id))}'`,
				'HouseholdMembers'
			);
			if (others) {
				return sendJson(res, 400, { error: 'Transfer headship to another member first, or remove them all, before leaving' });
			}
		}
		const membership = await zcqlOne(
			zcql,
			`SELECT ROWID FROM HouseholdMembers WHERE CatalystUserId = '${esc(String(ctx.user.user_id))}'`,
			'HouseholdMembers'
		);
		if (membership) await app.datastore().table('HouseholdMembers').deleteRow(Number(membership.ROWID));
		if (ctx.household.is_head) {
			await app.datastore().table('Households').deleteRow(ctx.household.id);
		}
		sendJson(res, 200, { left: true });
	},

	'POST /household/transfer-head': async (app, req, res, query, ctx) => {
		if (!ctx.household.is_head) return sendJson(res, 403, { error: 'Only the current head can transfer headship' });
		const body = await getBody(req);
		const targetUserId = (body.user_id || '').toString().trim();
		if (!targetUserId) return sendJson(res, 400, { error: 'user_id is required' });
		if (targetUserId === String(ctx.user.user_id)) {
			return sendJson(res, 400, { error: 'Choose someone else to become head' });
		}
		const zcql = app.zcql();
		const target = await zcqlOne(
			zcql,
			`SELECT ROWID, HouseholdId FROM HouseholdMembers WHERE CatalystUserId = '${esc(targetUserId)}'`,
			'HouseholdMembers'
		);
		if (!target || Number(target.HouseholdId) !== ctx.household.id) {
			return sendJson(res, 404, { error: 'Not a member of your family' });
		}
		const selfMembership = await zcqlOne(
			zcql,
			`SELECT ROWID FROM HouseholdMembers WHERE CatalystUserId = '${esc(String(ctx.user.user_id))}'`,
			'HouseholdMembers'
		);
		if (!selfMembership) return sendJson(res, 404, { error: 'Membership not found' });

		// The actual authorization gate: only succeeds if THIS caller is still
		// the head at the instant the database applies it. The is_head check
		// above reads a snapshot taken at request start, so two concurrent
		// transfer-head calls (the same head firing twice, or racing another
		// head-changing action) can both pass it and both believe they're
		// authorized — confirmed live: HouseholdMembers ended up with two
		// Role='head' rows after a concurrent-transfer repro. A single
		// conditional UPDATE is evaluated as one statement by the database,
		// so of two concurrent attempts sharing WHERE HeadUserId = '<caller>',
		// only one can still find it true and land; the loser gets zero rows
		// back and must abort here, before touching HouseholdMembers at all.
		const won = await zcqlOne(
			zcql,
			`UPDATE Households SET HeadUserId = '${esc(targetUserId)}' WHERE ROWID = ${ctx.household.id} AND HeadUserId = '${esc(String(ctx.user.user_id))}'`,
			'Households'
		);
		if (!won) {
			return sendJson(res, 409, { error: 'Headship already changed by someone else — refresh and try again' });
		}

		// The CAS above only guards against a concurrent transfer-head — it
		// says nothing about a concurrent DELETE /household/members removing
		// the very person we just made head. `target` was read before the CAS,
		// so a removal landing in between leaves Households.HeadUserId pointing
		// at someone with no HouseholdMembers row at all: nobody can act as
		// head (the new "head" has no membership to be recognized by), and
		// nobody can fix it (the old head just gave that up) — confirmed as a
		// real, reproducible bug. Re-check the target still exists right after
		// winning the CAS, and if not, compensate by reverting HeadUserId back
		// to the caller rather than leaving a dangling reference. This can't be
		// made airtight without cross-table transactions, but it turns a
		// permanently-stuck household into, at worst, a "try again" for the
		// caller — DELETE /household/members closes the same gap from its side
		// by refusing to remove whoever currently holds HeadUserId.
		const targetStillMember = await zcqlOne(
			zcql,
			`SELECT ROWID FROM HouseholdMembers WHERE CatalystUserId = '${esc(targetUserId)}' AND HouseholdId = ${ctx.household.id}`,
			'HouseholdMembers'
		);
		if (!targetStillMember) {
			await app.datastore().table('Households').updateRow({ ROWID: ctx.household.id, HeadUserId: String(ctx.user.user_id) })
				.catch((e) => console.error('failed to revert HeadUserId after target vanished:', e));
			return sendJson(res, 409, { error: 'That member was removed during the transfer — try again' });
		}

		// Households.HeadUserId (just updated atomically above) is what every
		// is_head check actually reads — these two Role updates are display-only
		// from here on. Promote-before-demote no longer matters for correctness,
		// only for what the member list shows if one of these two calls fails
		// partway through.
		await app.datastore().table('HouseholdMembers').updateRow({ ROWID: Number(target.ROWID), Role: 'head' });
		await app.datastore().table('HouseholdMembers').updateRow({ ROWID: Number(selfMembership.ROWID), Role: 'member' });

		sendJson(res, 200, { transferred: targetUserId });
		await pushToHouseholdMembers(app, ctx.household.id, ctx.user.user_id, '👑 Family headship changed — open Bonzaa for details', {
			type: 'head_transferred'
		}).catch((e) => console.error('notify transfer-head failed:', e));
	},

	'DELETE /household/members': async (app, req, res, query, ctx) => {
		if (!ctx.household) return sendJson(res, 409, { error: 'no_household' });
		if (!ctx.household.is_head) return sendJson(res, 403, { error: 'Only the head of the family can remove members' });
		const targetUserId = query.get('user_id');
		if (!targetUserId) return sendJson(res, 400, { error: 'user_id is required' });
		if (targetUserId === String(ctx.user.user_id)) {
			return sendJson(res, 400, { error: 'Use leave, not remove, for yourself' });
		}
		const zcql = app.zcql();
		const member = await zcqlOne(
			zcql,
			`SELECT ROWID, HouseholdId FROM HouseholdMembers WHERE CatalystUserId = '${esc(targetUserId)}'`,
			'HouseholdMembers'
		);
		if (!member || Number(member.HouseholdId) !== ctx.household.id) {
			return sendJson(res, 404, { error: 'Not a member of your family' });
		}
		// A fresh read, not ctx.household.head_user_id (a stale snapshot from
		// request start) — this is the other half of the fix in
		// 'POST /household/transfer-head': if a transfer just landed and made
		// this exact target the head, removing them now would leave
		// Households.HeadUserId pointing at someone we're about to delete from
		// HouseholdMembers, the same dangling-head state from the opposite
		// direction. Refusing here doesn't need a compensating step, unlike the
		// transfer side — nothing has been written yet.
		const currentHousehold = await zcqlOne(
			zcql,
			`SELECT HeadUserId FROM Households WHERE ROWID = ${ctx.household.id}`,
			'Households'
		);
		if (currentHousehold && String(currentHousehold.HeadUserId) === targetUserId) {
			return sendJson(res, 409, { error: 'This member just became the head — transfer headship away from them first' });
		}
		// Denylist the removed user for this household BEFORE anything else —
		// so it's already in place before the rotate/delete sequence below even
		// starts, closing POST /household/join to them regardless of which
		// invite code (old or new) they present during that window.
		await markRecentlyRemoved(app, ctx.household.id, targetUserId);
		// Rotate the invite code BEFORE deleting the membership, not after: the
		// removed member saw this code while they were in the household (every
		// member can see it, to help grow the family), so if the delete lands
		// first there's a real window where the old code still works and a
		// flood of join attempts could land in it. Rotating first means the old
		// code is already dead before the removal takes effect — no window at all,
		// not just a smaller one.
		const newCode = await generateUniqueInviteCode(app);
		if (newCode) {
			await app.datastore().table('Households').updateRow({ ROWID: ctx.household.id, InviteCode: newCode });
		}
		await app.datastore().table('HouseholdMembers').deleteRow(Number(member.ROWID));
		sendJson(res, 200, { removed: targetUserId });
	},

	/* ---- puppies ---- */

	'GET /puppies': async (app, req, res, query, ctx) => {
		const rows = await zcqlAll(app.zcql(), `SELECT * FROM Puppies WHERE HouseholdId = ${ctx.household.id} ORDER BY CREATEDTIME`, 'Puppies');
		sendJson(res, 200, { puppies: rows });
	},

	'POST /puppies': async (app, req, res, query, ctx) => {
		const body = await getBody(req);
		if (!body.name) return sendJson(res, 400, { error: 'name is required' });
		const row = await app.datastore().table('Puppies').insertRow({
			Name: body.name,
			Breed: body.breed || '',
			BirthDate: body.birth_date || null,
			PhotoUrl: body.photo_url || '',
			Notes: body.notes || '',
			HouseholdId: ctx.household.id
		});
		sendJson(res, 201, { puppy: row });
	},

	'DELETE /puppies': async (app, req, res, query, ctx) => {
		const id = Number(query.get('id'));
		if (!id) return sendJson(res, 400, { error: 'id is required' });
		await assertRowInHousehold(app, 'Puppies', id, ctx.household.id);
		await app.datastore().table('Puppies').deleteRow(id);
		sendJson(res, 200, { deleted: String(id) });
	},

	/* ---- foods ---- */

	'GET /foods': async (app, req, res, query, ctx) => {
		const rows = await zcqlAll(app.zcql(), `SELECT * FROM FoodItems WHERE HouseholdId = ${ctx.household.id} ORDER BY Name`, 'FoodItems');
		sendJson(res, 200, { foods: rows });
	},

	'POST /foods': async (app, req, res, query, ctx) => {
		const body = await getBody(req);
		if (!body.name) return sendJson(res, 400, { error: 'name is required' });
		if (body.usual_puppy_id) await assertPuppyInHousehold(app, body.usual_puppy_id, ctx.household.id);
		const row = await app.datastore().table('FoodItems').insertRow({
			Name: body.name,
			Brand: body.brand || '',
			FoodType: body.food_type || 'other',
			Notes: body.notes || '',
			HouseholdId: ctx.household.id,
			...(body.usual_puppy_id ? { UsualPuppyId: Number(body.usual_puppy_id) } : {})
		});
		sendJson(res, 201, { food: row });
	},

	'PUT /foods': async (app, req, res, query, ctx) => {
		const body = await getBody(req);
		if (!body.id) return sendJson(res, 400, { error: 'id is required' });
		await assertRowInHousehold(app, 'FoodItems', body.id, ctx.household.id);
		if (body.usual_puppy_id) await assertPuppyInHousehold(app, body.usual_puppy_id, ctx.household.id);
		const patch = { ROWID: Number(body.id) };
		if (body.name != null) patch.Name = body.name;
		if (body.brand != null) patch.Brand = body.brand;
		if (body.food_type != null) patch.FoodType = body.food_type;
		if (body.notes != null) patch.Notes = body.notes;
		// present-but-empty clears the tag; absent leaves it untouched
		if ('usual_puppy_id' in body) {
			patch.UsualPuppyId = body.usual_puppy_id ? Number(body.usual_puppy_id) : null;
		}
		const row = await app.datastore().table('FoodItems').updateRow(patch);
		sendJson(res, 200, { food: row });
	},

	'DELETE /foods': async (app, req, res, query, ctx) => {
		const id = Number(query.get('id'));
		if (!id) return sendJson(res, 400, { error: 'id is required' });
		await assertRowInHousehold(app, 'FoodItems', id, ctx.household.id);
		await app.datastore().table('FoodItems').deleteRow(id);
		sendJson(res, 200, { deleted: String(id) });
	},

	/* ---- feedings ---- */

	'GET /feedings': async (app, req, res, query, ctx) => {
		const puppyId = Number(query.get('puppy_id'));
		if (!puppyId) return sendJson(res, 400, { error: 'puppy_id is required' });
		await assertPuppyInHousehold(app, puppyId, ctx.household.id);
		const date = query.get('date'); // YYYY-MM-DD → that day's timeline, morning to night
		let where = `PuppyId = ${puppyId}`;
		if (date) where += ` AND FedAt >= '${esc(date)} 00:00:00' AND FedAt <= '${esc(date)} 23:59:59'`;
		const rows = await zcqlAll(
			app.zcql(),
			`SELECT * FROM FeedingLogs WHERE ${where} ORDER BY FedAt`,
			'FeedingLogs'
		);
		const feedings = rows.map((r) => ({ ...r, IsNewFood: toBool(r.IsNewFood) }));
		sendJson(res, 200, { feedings });
	},

	'POST /feedings': async (app, req, res, query, ctx) => {
		const body = await getBody(req);
		const required = ['puppy_id', 'food_item_id', 'fed_at', 'meal_slot'];
		for (const k of required) {
			if (!body[k]) return sendJson(res, 400, { error: `${k} is required` });
		}
		if (!isValidDatetime(body.fed_at)) {
			return sendJson(res, 400, { error: "fed_at must be 'YYYY-MM-DD HH:mm:ss'" });
		}
		await assertPuppyInHousehold(app, body.puppy_id, ctx.household.id);
		// Without this, a feeding could point at another household's FoodItems row —
		// computeSuspects()'s metadata lookup isn't household-scoped (it trusts the
		// FoodItemIds it's handed came from an already-verified puppy), so that food's
		// name/brand/type would leak into this household's suspect analysis.
		await assertRowInHousehold(app, 'FoodItems', body.food_item_id, ctx.household.id);
		const row = await app.datastore().table('FeedingLogs').insertRow({
			PuppyId: Number(body.puppy_id),
			FoodItemId: Number(body.food_item_id),
			Quantity: body.quantity != null ? Number(body.quantity) : 0,
			Unit: body.unit || 'g',
			MealSlot: body.meal_slot, // morning | noon | evening | night
			FedAt: body.fed_at,
			FedBy: body.fed_by || '',
			IsNewFood: body.is_new_food ? 'true' : 'false',
			Notes: body.notes || ''
		});
		sendJson(res, 201, { feeding: row });
	},

	'DELETE /feedings': async (app, req, res, query, ctx) => {
		const id = Number(query.get('id'));
		if (!id) return sendJson(res, 400, { error: 'id is required' });
		const row = await zcqlOne(app.zcql(), `SELECT PuppyId FROM FeedingLogs WHERE ROWID = ${id}`, 'FeedingLogs');
		if (!row) return sendJson(res, 404, { error: 'Not found' });
		await assertPuppyInHousehold(app, row.PuppyId, ctx.household.id);
		await app.datastore().table('FeedingLogs').deleteRow(id);
		sendJson(res, 200, { deleted: String(id) });
	},

	/* ---- symptoms ---- */

	'GET /symptoms': async (app, req, res, query, ctx) => {
		const puppyId = Number(query.get('puppy_id'));
		if (!puppyId) return sendJson(res, 400, { error: 'puppy_id is required' });
		await assertPuppyInHousehold(app, puppyId, ctx.household.id);
		const rows = await zcqlAll(
			app.zcql(),
			`SELECT * FROM SymptomLogs WHERE PuppyId = ${puppyId} ORDER BY OnsetAt DESC`,
			'SymptomLogs'
		);
		sendJson(res, 200, { symptoms: rows });
	},

	'POST /symptoms': async (app, req, res, query, ctx) => {
		await checkRateLimit(app, 'symptom', ctx.user.user_id, 20);
		const body = await getBody(req);
		const required = ['puppy_id', 'symptom', 'onset_at'];
		for (const k of required) {
			if (!body[k]) return sendJson(res, 400, { error: `${k} is required` });
		}
		if (!isValidDatetime(body.onset_at)) {
			return sendJson(res, 400, { error: "onset_at must be 'YYYY-MM-DD HH:mm:ss'" });
		}
		await assertPuppyInHousehold(app, body.puppy_id, ctx.household.id);
		const row = await app.datastore().table('SymptomLogs').insertRow({
			PuppyId: Number(body.puppy_id),
			Symptom: body.symptom,
			Severity: body.severity || 'mild',
			OnsetAt: body.onset_at,
			Notes: body.notes || ''
		});
		// Immediately return the suspect analysis for this incident
		const analysis = await computeSuspects(app, body.puppy_id, body.onset_at);
		sendJson(res, 201, { symptom: row, analysis });
		// The person logging it doesn't need to wait on push delivery, but the
		// function must stay alive until it's attempted — await after responding.
		await notifyHouseholdOfSymptom(app, ctx, body.puppy_id)
			.catch((e) => console.error('notifyHouseholdOfSymptom failed:', e));
	},

	'DELETE /symptoms': async (app, req, res, query, ctx) => {
		const id = Number(query.get('id'));
		if (!id) return sendJson(res, 400, { error: 'id is required' });
		const row = await zcqlOne(app.zcql(), `SELECT PuppyId FROM SymptomLogs WHERE ROWID = ${id}`, 'SymptomLogs');
		if (!row) return sendJson(res, 404, { error: 'Not found' });
		await assertPuppyInHousehold(app, row.PuppyId, ctx.household.id);
		await app.datastore().table('SymptomLogs').deleteRow(id);
		sendJson(res, 200, { deleted: String(id) });
	},

	'GET /suspects': async (app, req, res, query, ctx) => {
		const puppyId = Number(query.get('puppy_id'));
		const onsetAt = query.get('onset_at');
		if (!puppyId || !onsetAt) {
			return sendJson(res, 400, { error: 'puppy_id and onset_at are required' });
		}
		if (!isValidDatetime(onsetAt)) {
			return sendJson(res, 400, { error: "onset_at must be 'YYYY-MM-DD HH:mm:ss'" });
		}
		await assertPuppyInHousehold(app, puppyId, ctx.household.id);
		const analysis = await computeSuspects(app, puppyId, onsetAt);
		sendJson(res, 200, analysis);
	}
};

// Routes that make sense with no household yet (or manage membership itself).
const HOUSEHOLD_EXEMPT = new Set([
	'GET /health', 'GET /household', 'POST /household', 'POST /household/join',
	'POST /household/leave', 'POST /household/join-requests/cancel'
]);

/*
 * Application-level auth gate. Catalyst Security Rules are managed server-side
 * (not in catalyst-config.json), so we enforce access in code here for a
 * reliable, deployable guarantee: an anonymous request carries no Catalyst
 * user session, so getCurrentUser() fails and we reject with 401. Requests
 * from the logged-in web client (session cookie) and the Android client
 * (Zoho-oauthtoken) resolve to a real user and pass. Data operations still
 * run at admin scope so App User table permissions don't block them — the
 * household check below is what actually keeps one family's data away from
 * another's, not the table permissions.
 */
async function getUser(req) {
	try {
		const userApp = catalyst.initialize(req); // user scope
		const user = await userApp.userManagement().getCurrentUser();
		return user && user.user_id ? user : null;
	} catch (e) {
		return null;
	}
}

module.exports = async (req, res) => {
	const url = new URL(req.url, 'http://localhost');
	const key = `${req.method} ${url.pathname.replace(/\/+$/, '') || '/'}`;
	const handler = routes[key];
	if (!handler) {
		return sendJson(res, 404, { error: 'Not found' });
	}
	if (key === 'GET /health') {
		return handler(null, req, res, url.searchParams, {});
	}

	const user = await getUser(req);
	if (!user) return sendJson(res, 401, { error: 'Authentication required' });

	try {
		const app = catalyst.initialize(req, { scope: 'admin' });
		const household = await getMembership(app, user.user_id);
		if (!HOUSEHOLD_EXEMPT.has(key)) requireHousehold(household);
		await handler(app, req, res, url.searchParams, { user, household });
	} catch (err) {
		if (err instanceof ApiError) {
			return sendJson(res, err.httpStatus, err.body);
		}
		// Log details server-side; return a generic message so schema/internal
		// details are not disclosed to clients.
		console.error('bonzaa_api error:', err);
		sendJson(res, 500, { error: 'Internal error' });
	}
};
