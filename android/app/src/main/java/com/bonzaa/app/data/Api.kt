package com.bonzaa.app.data

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

interface BonzaaApi {

    @GET("puppies")
    suspend fun getPuppies(): PuppiesResponse

    @POST("puppies")
    suspend fun addPuppy(@Body body: NewPuppy): PuppyResponse

    @DELETE("puppies")
    suspend fun deletePuppy(@Query("id") id: String): DeleteResponse

    @GET("foods")
    suspend fun getFoods(): FoodsResponse

    @POST("foods")
    suspend fun addFood(@Body body: NewFood): FoodResponse

    @PUT("foods")
    suspend fun updateFood(@Body body: UpdateFood): FoodResponse

    @DELETE("foods")
    suspend fun deleteFood(@Query("id") id: String): DeleteResponse

    @GET("feedings")
    suspend fun getFeedings(
        @Query("puppy_id") puppyId: String,
        @Query("date") date: String? = null,
    ): FeedingsResponse

    @POST("feedings")
    suspend fun addFeeding(@Body body: NewFeeding): FeedingResponse

    @DELETE("feedings")
    suspend fun deleteFeeding(@Query("id") id: String): DeleteResponse

    @GET("symptoms")
    suspend fun getSymptoms(@Query("puppy_id") puppyId: String): SymptomsResponse

    @POST("symptoms")
    suspend fun logSymptom(@Body body: NewSymptom): SymptomCreateResponse

    @DELETE("symptoms")
    suspend fun deleteSymptom(@Query("id") id: String): DeleteResponse

    @GET("suspects")
    suspend fun getSuspects(
        @Query("puppy_id") puppyId: String,
        @Query("onset_at") onsetAt: String,
    ): SuspectAnalysis
}

object ApiClient {
    private const val BASE_URL =
        "https://bonzaa-60031184881.development.catalystserverless.in/server/bonzaa_api/"

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }

    val api: BonzaaApi by lazy {
        val client = OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
            .build()

        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(BonzaaApi::class.java)
    }
}
