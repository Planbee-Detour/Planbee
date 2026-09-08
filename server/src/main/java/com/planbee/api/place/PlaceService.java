package com.planbee.api.place;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.planbee.api.common.error.BusinessException;
import com.planbee.api.common.error.CommonErrorCode;
import com.planbee.api.place.dto.NearbyPlace;
import com.planbee.api.place.dto.NearbyPlaceList;
import com.planbee.api.place.dto.PlaceDetail;
import com.planbee.api.place.tour.TourApiClient;
import com.planbee.api.place.tour.TourApiClient.TourDetail;
import com.planbee.api.place.tour.TourApiClient.TourPlace;

/**
 * 주변 장소·장소 상세. 데이터 소스는 한국관광공사 TourAPI 하나다.
 *
 * <p>화면 문구(거리·태그·출처)는 여기서 만든다 (C-8). 외부 실패는 {@link TourApiClient} 가
 * {@code PLACE_UPSTREAM_UNAVAILABLE} 로 바꿔 던지므로 여기서 따로 감싸지 않는다.
 *
 * <p>응답은 캐시한다 — 같은 좌표·필터의 반복 조회로 TourAPI 쿼터를 소모하지 않기 위해서다
 * (`spring.cache.caffeine.spec` 의 TTL 로 만료).
 */
@Service
public class PlaceService {

	private static final int MIN_RADIUS_METERS = 100;
	private static final int MAX_RADIUS_METERS = 20000;
	private static final int MAX_SIZE = 45;
	private static final String SOURCE_PREFIX = "tour:";
	private static final String SOURCE_LABEL = "한국관광공사 제공";

	private final TourApiClient tourApiClient;

	public PlaceService(TourApiClient tourApiClient) {
		this.tourApiClient = tourApiClient;
	}

	@Cacheable(cacheNames = "places.nearby", key = "{#latitude, #longitude, #radius, #size, #sort, #categories}")
	public NearbyPlaceList nearby(double latitude, double longitude, int radius, int size, String sort,
			List<String> categories) {
		validateCoordinate(latitude, longitude);
		validateRadius(radius);
		validateSize(size);
		assertSupportedSort(sort);
		List<TourContentType> types = resolveCategories(categories);

		// 유형별로 조회한다 (TourAPI 는 contentTypeId 를 한 번에 하나만 받는다). 각 호출은 거리순이지만
		// 합치면 순서가 깨지므로, contentid 로 중복을 제거한 뒤 거리로 다시 정렬한다.
		Map<String, TourPlace> byId = new LinkedHashMap<>();
		for (TourContentType type : types) {
			for (TourPlace place : tourApiClient.locationBasedList(
					latitude, longitude, radius, type.contentTypeId(), size)) {
				if (place.contentId() != null) {
					byId.putIfAbsent(place.contentId(), place);
				}
			}
		}

		List<NearbyPlace> items = byId.values().stream()
				// 좌표가 없으면 지도에 찍을 수 없다 — "주변" 목록에 넣지 않는다.
				.filter(place -> place.latitude() != null && place.longitude() != null)
				.sorted(Comparator.comparing(TourPlace::distanceMeters, Comparator.nullsLast(Comparator.naturalOrder())))
				.limit(size)
				.map(this::toNearbyPlace)
				.toList();
		return new NearbyPlaceList(items);
	}

	/** 계약이 정의한 정렬은 {@code distance} 하나다. 다른 값은 400 으로 거절한다. */
	private static void assertSupportedSort(String sort) {
		if (sort != null && !"distance".equals(sort)) {
			throw new BusinessException(CommonErrorCode.VALIDATION_FAILED, "지원하지 않는 sort 값입니다: " + sort);
		}
	}

	@Cacheable(cacheNames = "places.detail", key = "#placeId")
	public PlaceDetail detail(String placeId) {
		String contentId = parseContentId(placeId);

		TourDetail detail = tourApiClient.detailCommon(contentId)
				.orElseThrow(() -> new BusinessException(PlaceErrorCode.NOT_FOUND));

		String openingHours = tourApiClient.openingHours(contentId, detail.contentTypeId()).orElse(null);

		return new PlaceDetail(
				SOURCE_PREFIX + detail.contentId(),
				categoryLabel(detail.contentTypeId()),
				null,
				detail.title(),
				detail.imageUrl(),
				detail.address(),
				openingHours,
				null,
				typeTags(detail.contentTypeId()),
				detail.overview(),
				null,
				detail.latitude(),
				detail.longitude(),
				SOURCE_LABEL);
	}

	// ── 매핑 ─────────────────────────────────────────────────────────

	/** 좌표가 있는 {@link TourPlace} 만 들어온다 (호출부에서 걸러진다). */
	private NearbyPlace toNearbyPlace(TourPlace place) {
		return new NearbyPlace(
				SOURCE_PREFIX + place.contentId(),
				categoryLabel(place.contentTypeId()),
				null,
				place.title(),
				place.imageUrl(),
				place.distanceMeters() == null ? null : Distances.label(place.distanceMeters()),
				typeTags(place.contentTypeId()),
				place.latitude(),
				place.longitude());
	}

	private static String categoryLabel(int contentTypeId) {
		return TourContentType.fromContentTypeId(contentTypeId).map(TourContentType::label).orElse("기타");
	}

	private static List<String> typeTags(int contentTypeId) {
		return TourContentType.fromContentTypeId(contentTypeId)
				.map(type -> List.of("#" + type.label()))
				.orElse(null);
	}

	// ── 검증 ─────────────────────────────────────────────────────────

	private static void validateCoordinate(double latitude, double longitude) {
		if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
			throw new BusinessException(CommonErrorCode.VALIDATION_FAILED, "좌표 값이 범위를 벗어났습니다.");
		}
	}

	private static void validateRadius(int radius) {
		if (radius < MIN_RADIUS_METERS || radius > MAX_RADIUS_METERS) {
			throw new BusinessException(CommonErrorCode.VALIDATION_FAILED,
					"radius 는 %d~%d 사이여야 합니다.".formatted(MIN_RADIUS_METERS, MAX_RADIUS_METERS));
		}
	}

	private static void validateSize(int size) {
		if (size < 1 || size > MAX_SIZE) {
			throw new BusinessException(CommonErrorCode.VALIDATION_FAILED, "size 는 1~%d 사이여야 합니다.".formatted(MAX_SIZE));
		}
	}

	private static List<TourContentType> resolveCategories(List<String> categories) {
		if (categories == null || categories.isEmpty()) {
			return TourContentType.DEFAULT;
		}
		List<TourContentType> resolved = new ArrayList<>();
		for (String value : categories) {
			TourContentType type = TourContentType.fromApiValue(value)
					.orElseThrow(() -> new BusinessException(
							CommonErrorCode.VALIDATION_FAILED, "지원하지 않는 category 값입니다: " + value));
			if (!resolved.contains(type)) {
				resolved.add(type);
			}
		}
		return resolved;
	}

	private static String parseContentId(String placeId) {
		if (placeId == null || !placeId.startsWith(SOURCE_PREFIX)) {
			throw new BusinessException(CommonErrorCode.MALFORMED_REQUEST, "place_id 형식이 올바르지 않습니다.");
		}
		String contentId = placeId.substring(SOURCE_PREFIX.length());
		if (contentId.isBlank() || !contentId.chars().allMatch(Character::isDigit)) {
			throw new BusinessException(CommonErrorCode.MALFORMED_REQUEST, "place_id 형식이 올바르지 않습니다.");
		}
		return contentId;
	}
}
