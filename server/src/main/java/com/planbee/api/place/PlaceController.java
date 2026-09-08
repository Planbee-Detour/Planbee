package com.planbee.api.place;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.planbee.api.place.dto.NearbyPlaceList;
import com.planbee.api.place.dto.PlaceDetail;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * 계약: docs/features/nearby-places/contract.yaml · docs/features/place-detail/contract.yaml
 *
 * <p>컨트롤러는 바인딩과 위임만 한다 (S-5). 파라미터 검증과 오류는 {@link PlaceService} 가
 * {@code BusinessException} 으로 던지고 {@code GlobalExceptionHandler} 가 RFC 9457 로 바꾼다.
 *
 * <p>두 엔드포인트 모두 공개다 — {@code SecurityConfig.PUBLIC_PATHS} 의 {@code /api/v1/places/**}
 * 와 일치시킨다. 공개임을 스펙에도 명시한다 ({@code @SecurityRequirements}, S-19).
 */
@Tag(name = "place")
@RestController
@RequestMapping("/api/v1/places")
public class PlaceController {

	private final PlaceService placeService;

	public PlaceController(PlaceService placeService) {
		this.placeService = placeService;
	}

	@Operation(operationId = "getNearbyPlaces", summary = "주변 장소 조회")
	@SecurityRequirements
	@GetMapping(path = "/nearby", produces = MediaType.APPLICATION_JSON_VALUE)
	public NearbyPlaceList nearby(
			@RequestParam double latitude,
			@RequestParam double longitude,
			@Parameter(description = "콘텐츠 유형. 생략 시 attraction,culture", array = @ArraySchema(schema = @Schema(
					allowableValues = { "attraction", "culture", "leisure", "accommodation", "shopping", "restaurant" })))
			@RequestParam(name = "category", required = false) List<String> category,
			@Parameter(description = "검색 반경(m)", schema = @Schema(minimum = "100", maximum = "20000", defaultValue = "2000"))
			@RequestParam(required = false, defaultValue = "2000") int radius,
			@Parameter(description = "반환할 최대 장소 수", schema = @Schema(minimum = "1", maximum = "45", defaultValue = "15"))
			@RequestParam(required = false, defaultValue = "15") int size,
			@Parameter(description = "정렬. 현재 distance 만", schema = @Schema(allowableValues = "distance", defaultValue = "distance"))
			@RequestParam(required = false, defaultValue = "distance") String sort) {
		placeService.assertSupportedSort(sort);
		return placeService.nearby(latitude, longitude, radius, size, category);
	}

	@Operation(operationId = "getPlaceDetail", summary = "장소 상세 조회")
	@SecurityRequirements
	@GetMapping(path = "/{place_id}", produces = MediaType.APPLICATION_JSON_VALUE)
	public PlaceDetail detail(@PathVariable("place_id") String placeId) {
		return placeService.detail(placeId);
	}
}
