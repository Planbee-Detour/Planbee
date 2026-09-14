package com.planbee.api.place.tour;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.planbee.api.common.error.BusinessException;
import com.planbee.api.place.PlaceErrorCode;

/**
 * 한국관광공사 TourAPI(KorService2) 호출. (server.md S-31)
 *
 * <p>TourAPI 는 결과가 없을 때 {@code body.items} 를 객체가 아니라 빈 문자열로 주고, 오류를
 * HTTP 200 + {@code header.resultCode} 로 알린다. 그래서 레코드로 바로 역직렬화하지 않고
 * {@link JsonNode} 로 방어적으로 읽는다.
 *
 * <p>상류 실패(5xx·타임아웃·resultCode 오류)는 전부 {@link PlaceErrorCode#UPSTREAM_UNAVAILABLE}
 * 로 바꿔 던진다 — 서비스·컨트롤러는 원인을 구분하지 않는다 (S-7).
 */
@Component
public class TourApiClient {

	private static final Logger log = LoggerFactory.getLogger(TourApiClient.class);
	private static final String OK_RESULT_CODE = "0000";

	private final RestClient restClient;
	private final String serviceKey;

	public TourApiClient(TourApiProperties properties) {
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(properties.connectTimeout());
		factory.setReadTimeout(properties.readTimeout());
		this.restClient = RestClient.builder()
				.baseUrl(properties.baseUrl())
				.requestFactory(factory)
				.build();
		this.serviceKey = properties.serviceKey();
	}

	/**
	 * 좌표 기준 주변 장소. contentTypeId 는 한 번에 하나만 받으므로, 여러 유형은 호출부가
	 * 유형별로 부른 뒤 합친다. 결과가 없으면 빈 리스트.
	 */
	public List<TourPlace> locationBasedList(double latitude, double longitude, int radius, int contentTypeId, int size) {
		JsonNode body = requestBody(builder -> common(builder, "locationBasedList2")
				.queryParam("mapX", longitude)
				.queryParam("mapY", latitude)
				.queryParam("radius", radius)
				.queryParam("contentTypeId", contentTypeId)
				.queryParam("arrange", "S") // S = 거리순
				.queryParam("numOfRows", size)
				.queryParam("pageNo", 1)
				.build());

		List<TourPlace> places = new ArrayList<>();
		for (JsonNode item : items(body)) {
			places.add(new TourPlace(
					text(item, "contentid"),
					intOrZero(item, "contenttypeid"),
					text(item, "title"),
					firstNonBlank(text(item, "firstimage"), text(item, "firstimage2")),
					joinAddress(text(item, "addr1"), text(item, "addr2")),
					doubleOrNull(item, "mapy"),
					doubleOrNull(item, "mapx"),
					intOrNull(item, "dist")));
		}
		return places;
	}

	/** contentId 상세. 없으면 빈 Optional → 호출부가 404. */
	public Optional<TourDetail> detailCommon(String contentId) {
		JsonNode body = requestBody(builder -> common(builder, "detailCommon2")
				.queryParam("contentId", contentId)
				.build());

		JsonNode item = firstItem(body);
		if (item == null) {
			return Optional.empty();
		}
		return Optional.of(new TourDetail(
				text(item, "contentid"),
				intOrZero(item, "contenttypeid"),
				text(item, "title"),
				text(item, "firstimage"),
				joinAddress(text(item, "addr1"), text(item, "addr2")),
				stripHtml(text(item, "overview")),
				doubleOrNull(item, "mapy"),
				doubleOrNull(item, "mapx")));
	}

	/** 운영시간 등 유형별 상세. 필드가 유형마다 달라 usetime 계열만 시도하고, 없으면 빈 Optional. */
	public Optional<String> openingHours(String contentId, int contentTypeId) {
		try {
			JsonNode item = firstItem(requestBody(builder -> common(builder, "detailIntro2")
					.queryParam("contentId", contentId)
					.queryParam("contentTypeId", contentTypeId)
					.build()));
			if (item == null) {
				return Optional.empty();
			}
			return List.of("usetime", "usetimeculture", "opentime", "opentimefood").stream()
					.map(field -> text(item, field))
					.filter(value -> value != null && !value.isBlank())
					.findFirst()
					.map(TourApiClient::stripHtml);
		}
		catch (RuntimeException exception) {
			// 운영시간은 있으면 좋은 값이다 — 실패해도 상세 조회 자체를 막지 않는다.
			log.debug("detailIntro2 실패 contentId={}", contentId, exception);
			return Optional.empty();
		}
	}

	// ── 내부 ─────────────────────────────────────────────────────────

	/**
	 * 모든 호출에 붙는 공통 파라미터. serviceKey 는 디코딩 키이고, RestClient 의 UriBuilder 가
	 * 값을 한 번 인코딩한다 (TourApiProperties javadoc).
	 */
	private UriBuilder common(UriBuilder builder, String path) {
		return builder.path("/" + path)
				.queryParam("serviceKey", serviceKey)
				.queryParam("MobileOS", "ETC")
				.queryParam("MobileApp", "Planbee")
				.queryParam("_type", "json");
	}

	private JsonNode requestBody(Function<UriBuilder, URI> uriFunction) {
		JsonNode root;
		try {
			root = restClient.get().uri(uriFunction).retrieve().body(JsonNode.class);
		}
		catch (RestClientException exception) {
			log.warn("TourAPI 요청 실패", exception);
			throw upstreamUnavailable();
		}
		if (root == null) {
			throw upstreamUnavailable();
		}
		String resultCode = root.path("response").path("header").path("resultCode").asText("");
		if (!OK_RESULT_CODE.equals(resultCode)) {
			log.warn("TourAPI resultCode={} msg={}", resultCode,
					root.path("response").path("header").path("resultMsg").asText(""));
			throw upstreamUnavailable();
		}
		return root.path("response").path("body");
	}

	private static BusinessException upstreamUnavailable() {
		return new BusinessException(PlaceErrorCode.UPSTREAM_UNAVAILABLE);
	}

	/** body.items.item — 배열이거나, 단일 객체이거나, (결과 없음이면) 빈 문자열이다. */
	private static List<JsonNode> items(JsonNode body) {
		JsonNode item = body.path("items").path("item");
		if (item.isArray()) {
			List<JsonNode> list = new ArrayList<>();
			item.forEach(list::add);
			return list;
		}
		if (item.isObject()) {
			return List.of(item);
		}
		return List.of();
	}

	private static JsonNode firstItem(JsonNode body) {
		List<JsonNode> list = items(body);
		return list.isEmpty() ? null : list.get(0);
	}

	private static String text(JsonNode node, String field) {
		String value = node.path(field).asText("");
		return value.isBlank() ? null : value;
	}

	private static int intOrZero(JsonNode node, String field) {
		return node.path(field).asInt(0);
	}

	private static Integer intOrNull(JsonNode node, String field) {
		JsonNode value = node.path(field);
		return value.isMissingNode() || value.asText("").isBlank() ? null : value.asInt();
	}

	private static Double doubleOrNull(JsonNode node, String field) {
		JsonNode value = node.path(field);
		if (value.isMissingNode() || value.asText("").isBlank()) {
			return null;
		}
		double parsed = value.asDouble();
		return parsed == 0.0 ? null : parsed;
	}

	private static String firstNonBlank(String first, String second) {
		return first != null ? first : second;
	}

	private static String joinAddress(String addr1, String addr2) {
		if (addr1 == null) {
			return addr2;
		}
		return addr2 == null ? addr1 : addr1 + " " + addr2;
	}

	private static String stripHtml(String value) {
		return value == null ? null : value.replaceAll("<[^>]*>", "").strip();
	}

	/** locationBasedList2 의 한 항목. TourAPI 는 mapY=위도, mapX=경도. */
	public record TourPlace(
			String contentId,
			int contentTypeId,
			String title,
			String imageUrl,
			String address,
			Double latitude,
			Double longitude,
			Integer distanceMeters) {
	}

	/** detailCommon2 결과. */
	public record TourDetail(
			String contentId,
			int contentTypeId,
			String title,
			String imageUrl,
			String address,
			String overview,
			Double latitude,
			Double longitude) {
	}
}
