package com.planbee.api.place;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesRegex;
import static org.hamcrest.Matchers.nullValue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import com.planbee.api.support.IntegrationTest;

import io.restassured.RestAssured;

/**
 * place API 통합 테스트. 실제 컨텍스트 + 실제 HTTP 요청. 외부(TourAPI)는 WireMock 으로 스텁한다
 * (server-tester: 외부 연동은 목킹, `AGENTS.md` 테스트 계층).
 *
 * 판정 기준은 `docs/features/nearby-places/PRD.md` / `docs/features/place-detail/PRD.md` 의 AC 다.
 */
@IntegrationTest
class PlaceApiTest {

	@RegisterExtension
	static final WireMockExtension TOUR_API = WireMockExtension.newInstance()
			.options(wireMockConfig().dynamicPort())
			.build();

	@DynamicPropertySource
	static void tourApiBaseUrl(DynamicPropertyRegistry registry) {
		registry.add("planbee.place.tour.base-url", TOUR_API::baseUrl);
	}

	@LocalServerPort
	int port;

	@BeforeEach
	void setUp() {
		RestAssured.port = port;
		TOUR_API.resetAll();
	}

	// ── nearby ───────────────────────────────────────────────────────

	@Test
	void AC_NP_7_9_주변_조회는_거리순_상위_N개와_서버가_만든_거리_문구를_준다() {
		stubLocationBasedList(12, """
				{"contentid":"1","contenttypeid":"12","title":"먼 곳","mapx":"127.001","mapy":"37.501","dist":"1800"},
				{"contentid":"2","contenttypeid":"12","title":"가까운 곳","mapx":"127.0","mapy":"37.5","dist":"300"}
				""");
		stubLocationBasedList(14, "");

		given().queryParam("latitude", 37.5).queryParam("longitude", 127.0).queryParam("size", 5)
				.when().get("/api/v1/places/nearby")
				.then().statusCode(200)
				.body("items.name", contains("가까운 곳", "먼 곳"))
				.body("items[0].place_id", equalTo("tour:2"))
				.body("items[0].category", equalTo("관광지"))
				.body("items[0].distance_label", matchesRegex("300m · 도보 \\d+분"))
				.body("items[0].status_label", nullValue());
	}

	@Test
	void AC_NP_8_카테고리를_지정하면_그_유형만_조회한다() {
		stubLocationBasedList(39, """
				{"contentid":"9","contenttypeid":"39","title":"국밥집","mapx":"127.0","mapy":"37.5","dist":"120"}
				""");

		given().queryParam("latitude", 37.5).queryParam("longitude", 127.0).queryParam("category", "restaurant")
				.when().get("/api/v1/places/nearby")
				.then().statusCode(200)
				.body("items", hasSize(1))
				.body("items[0].place_id", equalTo("tour:9"));

		TOUR_API.verify(getRequestedFor(urlPathEqualTo("/locationBasedList2"))
				.withQueryParam("contentTypeId", WireMock.equalTo("39")));
		TOUR_API.verify(0, getRequestedFor(urlPathEqualTo("/locationBasedList2"))
				.withQueryParam("contentTypeId", WireMock.equalTo("12")));
	}

	@Test
	void AC_NP_10_반경_안에_결과가_없으면_빈_배열이다() {
		// TourAPI 는 결과가 없을 때 items 를 빈 문자열로 준다.
		TOUR_API.stubFor(get(urlPathEqualTo("/locationBasedList2")).willReturn(okJson(
				"{\"response\":{\"header\":{\"resultCode\":\"0000\",\"resultMsg\":\"OK\"},\"body\":{\"items\":\"\"}}}")));

		given().queryParam("latitude", 37.5).queryParam("longitude", 127.0)
				.when().get("/api/v1/places/nearby")
				.then().statusCode(200).body("items", hasSize(0));
	}

	@Test
	void AC_NP_10_TourAPI가_실패하면_500_PLACE_UPSTREAM_UNAVAILABLE_이다() {
		TOUR_API.stubFor(get(urlPathEqualTo("/locationBasedList2")).willReturn(aResponse().withStatus(503)));

		given().queryParam("latitude", 37.5).queryParam("longitude", 127.0)
				.when().get("/api/v1/places/nearby")
				.then().log().ifValidationFails().statusCode(500).body("code", equalTo("PLACE_UPSTREAM_UNAVAILABLE"));
	}

	@Test
	void TourAPI가_resultCode_오류를_주면_500_이다() {
		TOUR_API.stubFor(get(urlPathEqualTo("/locationBasedList2")).willReturn(okJson(
				"{\"response\":{\"header\":{\"resultCode\":\"22\",\"resultMsg\":\"LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS\"}}}")));

		given().queryParam("latitude", 37.5).queryParam("longitude", 127.0)
				.when().get("/api/v1/places/nearby")
				.then().log().ifValidationFails().statusCode(500).body("code", equalTo("PLACE_UPSTREAM_UNAVAILABLE"));
	}

	@Test
	void 범위를_벗어난_size_는_400_VALIDATION_FAILED_다() {
		given().queryParam("latitude", 37.5).queryParam("longitude", 127.0).queryParam("size", 99)
				.when().get("/api/v1/places/nearby")
				.then().statusCode(400).body("code", equalTo("VALIDATION_FAILED"));
	}

	@Test
	void enum_밖의_category_는_400_VALIDATION_FAILED_다() {
		given().queryParam("latitude", 37.5).queryParam("longitude", 127.0).queryParam("category", "bar")
				.when().get("/api/v1/places/nearby")
				.then().statusCode(400).body("code", equalTo("VALIDATION_FAILED"));
	}

	@Test
	void 지원하지_않는_sort_는_400_VALIDATION_FAILED_다() {
		given().queryParam("latitude", 37.5).queryParam("longitude", 127.0).queryParam("sort", "rating")
				.when().get("/api/v1/places/nearby")
				.then().statusCode(400).body("code", equalTo("VALIDATION_FAILED"));
	}

	@Test
	void 주변_조회는_인증_없이_접근된다() {
		stubLocationBasedList(12, "");
		stubLocationBasedList(14, "");
		given().queryParam("latitude", 37.5).queryParam("longitude", 127.0)
				.when().get("/api/v1/places/nearby")
				.then().statusCode(200);
	}

	// ── detail ───────────────────────────────────────────────────────

	@Test
	void AC_PD_2_3_상세는_한_응답으로_구성되고_없는_필드는_null_이다() {
		TOUR_API.stubFor(get(urlPathEqualTo("/detailCommon2")).withQueryParam("contentId", WireMock.equalTo("126508"))
				.willReturn(okJson(tourBody("""
						{"contentid":"126508","contenttypeid":"12","title":"경복궁","addr1":"서울 종로구 사직로 161",
						 "firstimage":"https://tong.visitkorea.or.kr/img.jpg","overview":"<p>조선의 법궁</p>",
						 "mapx":"126.9770","mapy":"37.5796"}
						"""))));
		TOUR_API.stubFor(get(urlPathEqualTo("/detailIntro2")).willReturn(okJson(tourBody("""
				{"contentid":"126508","usetime":"09:00~18:00"}
				"""))));

		given().when().get("/api/v1/places/tour:126508")
				.then().statusCode(200)
				.body("place_id", equalTo("tour:126508"))
				.body("name", equalTo("경복궁"))
				.body("category", equalTo("관광지"))
				.body("source_label", equalTo("한국관광공사 제공"))
				.body("description", equalTo("조선의 법궁"))
				.body("opening_hours", equalTo("09:00~18:00"))
				.body("distance_label", nullValue())
				.body("recommendation_reason", nullValue());
	}

	@Test
	void AC_PD_없는_contentid_는_404_PLACE_NOT_FOUND_다() {
		TOUR_API.stubFor(get(urlPathEqualTo("/detailCommon2")).willReturn(okJson(
				"{\"response\":{\"header\":{\"resultCode\":\"0000\",\"resultMsg\":\"OK\"},\"body\":{\"items\":\"\"}}}")));

		given().when().get("/api/v1/places/tour:0")
				.then().statusCode(404).body("code", equalTo("PLACE_NOT_FOUND"));
	}

	@Test
	void place_id_형식이_틀리면_400_MALFORMED_REQUEST_다() {
		given().when().get("/api/v1/places/kakao:1")
				.then().statusCode(400).body("code", equalTo("MALFORMED_REQUEST"));
	}

	// ── 스텁 헬퍼 ────────────────────────────────────────────────────

	private void stubLocationBasedList(int contentTypeId, String itemsCsv) {
		String items = itemsCsv.isBlank() ? "\"\"" : "{\"item\":[" + itemsCsv + "]}";
		TOUR_API.stubFor(get(urlPathEqualTo("/locationBasedList2"))
				.withQueryParam("contentTypeId", WireMock.equalTo(String.valueOf(contentTypeId)))
				.willReturn(okJson(
						"{\"response\":{\"header\":{\"resultCode\":\"0000\",\"resultMsg\":\"OK\"},\"body\":{\"items\":"
								+ items + "}}}")));
	}

	private static String tourBody(String itemJson) {
		return "{\"response\":{\"header\":{\"resultCode\":\"0000\",\"resultMsg\":\"OK\"},\"body\":{\"items\":{\"item\":["
				+ itemJson + "]}}}}";
	}
}
