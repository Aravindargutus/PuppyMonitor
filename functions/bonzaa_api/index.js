'use strict';

const catalyst = require('zcatalyst-sdk-node');

/*
 * Bonzaa Puppy Food Tracker — Advanced I/O API
 *
 * Tables (Data Store):
 *   Puppies     : Name, Breed, BirthDate(date), PhotoUrl(text), Notes(text)
 *   FoodItems   : Name, Brand, FoodType, Notes(text)
 *   FeedingLogs : PuppyId(bigint), FoodItemId(bigint), Quantity(double), Unit,
 *                 MealSlot, FedAt(datetime 'YYYY-MM-DD HH:mm:ss'), FedBy,
 *                 IsNewFood(boolean), Notes(text)
 *   SymptomLogs : PuppyId(bigint), Symptom, Severity, OnsetAt(datetime), Notes(text)
 *
 * Datetimes are handled as 'YYYY-MM-DD HH:mm:ss' strings in the project
 * timezone throughout — string comparison keeps ordering correct and avoids
 * the CREATEDTIME/UTC parsing pitfall.
 */

// Symptom onset window: food eaten between 2h and 48h before onset is suspect.
const SUSPECT_WINDOW_MIN_HOURS = 2;
const SUSPECT_WINDOW_MAX_HOURS = 48;
const BASELINE_DAYS = 14; // frequency baseline for down-weighting everyday foods

function sendJson(res, statusCode, data) {
	res.writeHead(statusCode, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(data));
}

function getBody(req) {
	return new Promise((resolve, reject) => {
		if (req.body && typeof req.body === 'object') return resolve(req.body);
		if (req.body && typeof req.body === 'string') {
			try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve({}); }
		}
		let data = '';
		req.on('data', (chunk) => { data += chunk; });
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
	return typeof s === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s);
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

async function deleteById(app, res, query, tableName) {
	const id = Number(query.get('id'));
	if (!id) return sendJson(res, 400, { error: 'id is required' });
	await app.datastore().table(tableName).deleteRow(id);
	sendJson(res, 200, { deleted: String(id) });
}

/* ---------- route handlers ---------- */

const routes = {
	'GET /health': async (app, req, res) => {
		sendJson(res, 200, { status: 'ok', service: 'bonzaa_api' });
	},

	'GET /puppies': async (app, req, res) => {
		const rows = await zcqlAll(app.zcql(), 'SELECT * FROM Puppies ORDER BY CREATEDTIME', 'Puppies');
		sendJson(res, 200, { puppies: rows });
	},

	'POST /puppies': async (app, req, res) => {
		const body = await getBody(req);
		if (!body.name) return sendJson(res, 400, { error: 'name is required' });
		const row = await app.datastore().table('Puppies').insertRow({
			Name: body.name,
			Breed: body.breed || '',
			BirthDate: body.birth_date || null,
			PhotoUrl: body.photo_url || '',
			Notes: body.notes || ''
		});
		sendJson(res, 201, { puppy: row });
	},

	'GET /foods': async (app, req, res) => {
		const rows = await zcqlAll(app.zcql(), 'SELECT * FROM FoodItems ORDER BY Name', 'FoodItems');
		sendJson(res, 200, { foods: rows });
	},

	'POST /foods': async (app, req, res) => {
		const body = await getBody(req);
		if (!body.name) return sendJson(res, 400, { error: 'name is required' });
		const row = await app.datastore().table('FoodItems').insertRow({
			Name: body.name,
			Brand: body.brand || '',
			FoodType: body.food_type || 'other',
			Notes: body.notes || ''
		});
		sendJson(res, 201, { food: row });
	},

	'GET /feedings': async (app, req, res, query) => {
		const puppyId = Number(query.get('puppy_id'));
		if (!puppyId) return sendJson(res, 400, { error: 'puppy_id is required' });
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

	'POST /feedings': async (app, req, res) => {
		const body = await getBody(req);
		const required = ['puppy_id', 'food_item_id', 'fed_at', 'meal_slot'];
		for (const k of required) {
			if (!body[k]) return sendJson(res, 400, { error: `${k} is required` });
		}
		if (!isValidDatetime(body.fed_at)) {
			return sendJson(res, 400, { error: "fed_at must be 'YYYY-MM-DD HH:mm:ss'" });
		}
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

	'GET /symptoms': async (app, req, res, query) => {
		const puppyId = Number(query.get('puppy_id'));
		if (!puppyId) return sendJson(res, 400, { error: 'puppy_id is required' });
		const rows = await zcqlAll(
			app.zcql(),
			`SELECT * FROM SymptomLogs WHERE PuppyId = ${puppyId} ORDER BY OnsetAt DESC`,
			'SymptomLogs'
		);
		sendJson(res, 200, { symptoms: rows });
	},

	'POST /symptoms': async (app, req, res) => {
		const body = await getBody(req);
		const required = ['puppy_id', 'symptom', 'onset_at'];
		for (const k of required) {
			if (!body[k]) return sendJson(res, 400, { error: `${k} is required` });
		}
		if (!isValidDatetime(body.onset_at)) {
			return sendJson(res, 400, { error: "onset_at must be 'YYYY-MM-DD HH:mm:ss'" });
		}
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
	},

	'DELETE /puppies': async (app, req, res, query) => deleteById(app, res, query, 'Puppies'),
	'DELETE /foods': async (app, req, res, query) => deleteById(app, res, query, 'FoodItems'),
	'DELETE /feedings': async (app, req, res, query) => deleteById(app, res, query, 'FeedingLogs'),
	'DELETE /symptoms': async (app, req, res, query) => deleteById(app, res, query, 'SymptomLogs'),

	'GET /suspects': async (app, req, res, query) => {
		const puppyId = Number(query.get('puppy_id'));
		const onsetAt = query.get('onset_at');
		if (!puppyId || !onsetAt) {
			return sendJson(res, 400, { error: 'puppy_id and onset_at are required' });
		}
		if (!isValidDatetime(onsetAt)) {
			return sendJson(res, 400, { error: "onset_at must be 'YYYY-MM-DD HH:mm:ss'" });
		}
		const analysis = await computeSuspects(app, puppyId, onsetAt);
		sendJson(res, 200, analysis);
	}
};

module.exports = async (req, res) => {
	const url = new URL(req.url, 'http://localhost');
	const key = `${req.method} ${url.pathname.replace(/\/+$/, '') || '/'}`;
	const handler = routes[key];
	if (!handler) {
		return sendJson(res, 404, { error: `No route for ${key}` });
	}
	try {
		const app = catalyst.initialize(req, { scope: 'admin' });
		await handler(app, req, res, url.searchParams);
	} catch (err) {
		console.error('bonzaa_api error:', err);
		sendJson(res, 500, { error: err.message || 'Internal error' });
	}
};
