package com.planbee.api.place.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 장소 상세. 계약: docs/features/place-detail/contract.yaml.
 *
 * <p>없는 선택 필드는 {@code null} 이고 앱은 그 영역을 숨긴다 (AC-PD-3).
 * {@code sourceLabel} 은 항상 "한국관광공사 제공".
 */
@Schema(description = "장소 상세")
public record PlaceDetail(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "tour:126508") String placeId,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "역사 · 문화") String category,
		@Schema(nullable = true, example = "운영 중") String statusLabel,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "경복궁") String name,
		@Schema(nullable = true, format = "uri") String imageUrl,
		@Schema(nullable = true) String address,
		@Schema(nullable = true) String openingHours,
		@Schema(nullable = true) String distanceLabel,
		@Schema(nullable = true) List<String> tags,
		@Schema(nullable = true) String description,
		@Schema(nullable = true) String recommendationReason,
		@Schema(nullable = true) Double latitude,
		@Schema(nullable = true) Double longitude,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "한국관광공사 제공") String sourceLabel) {
}
