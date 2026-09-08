package com.planbee.api.place;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.planbee.api.common.error.BusinessException;
import com.planbee.api.common.error.CommonErrorCode;
import com.planbee.api.common.error.GlobalExceptionHandler;
import com.planbee.api.common.security.SecurityConfig;
import com.planbee.api.common.security.SecurityProblemResponder;
import com.planbee.api.place.dto.NearbyPlace;
import com.planbee.api.place.dto.NearbyPlaceList;

/**
 * 웹 레이어 슬라이스 스모크. 계약대로 매핑되는지와 공개 접근만 본다 — 랭킹·캐시·TourAPI 파싱은
 * server-tester 가 통합 테스트로 검증한다.
 */
@WebMvcTest(PlaceController.class)
@Import({ SecurityConfig.class, SecurityProblemResponder.class, GlobalExceptionHandler.class })
class PlaceControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private PlaceService placeService;

	@Test
	void 주변_장소_조회는_인증_없이_200과_목록을_반환한다() throws Exception {
		when(placeService.nearby(anyDouble(), anyDouble(), anyInt(), anyInt(), any(), any()))
				.thenReturn(new NearbyPlaceList(List.of(new NearbyPlace(
						"tour:126508", "관광지", null, "경복궁", null, "850m · 도보 12분",
						List.of("#관광지"), 37.579617, 126.977041))));

		mockMvc.perform(get("/api/v1/places/nearby").param("latitude", "37.58").param("longitude", "126.98"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].place_id").value("tour:126508"))
				.andExpect(jsonPath("$.items[0].distance_label").value("850m · 도보 12분"));
	}

	@Test
	void 잘못된_파라미터는_400_VALIDATION_FAILED_로_변환된다() throws Exception {
		when(placeService.nearby(anyDouble(), anyDouble(), anyInt(), anyInt(), any(), any()))
				.thenThrow(new BusinessException(CommonErrorCode.VALIDATION_FAILED));

		mockMvc.perform(get("/api/v1/places/nearby").param("latitude", "999").param("longitude", "126.98"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
	}

	@Test
	void 없는_장소_상세는_404와_PLACE_NOT_FOUND_코드를_반환한다() throws Exception {
		when(placeService.detail(eq("tour:0"))).thenThrow(new BusinessException(PlaceErrorCode.NOT_FOUND));

		mockMvc.perform(get("/api/v1/places/tour:0"))
				.andExpect(status().isNotFound())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.code").value("PLACE_NOT_FOUND"));
	}
}
