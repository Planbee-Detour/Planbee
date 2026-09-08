package com.planbee.api.place.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/** 주변 장소 조회 응답. 반경 안에 결과가 없으면 {@code items} 가 빈 배열이다 (AC-NP-5 비어있음). */
@Schema(description = "주변 장소 목록")
public record NearbyPlaceList(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<NearbyPlace> items) {
}
