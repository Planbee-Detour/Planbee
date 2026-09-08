package com.planbee.api.place.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 주변 장소 목록의 한 항목. 계약: docs/features/nearby-places/contract.yaml.
 *
 * <p>{@code statusLabel}·{@code tags}·{@code imageUrl} 은 TourAPI 등록 정보가 있을 때만 채워진다 —
 * 없으면 {@code null} 이고 앱은 그 요소를 숨긴다.
 */
@Schema(description = "주변 장소 목록 항목")
public record NearbyPlace(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "tour:126508") String placeId,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "관광지") String category,
		@Schema(nullable = true, example = "운영 중") String statusLabel,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "경복궁") String name,
		@Schema(nullable = true, format = "uri") String imageUrl,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "850m · 도보 12분") String distanceLabel,
		@Schema(nullable = true, example = "[\"#관광지\"]") List<String> tags,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) double latitude,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) double longitude) {
}
