package com.planbee.api.health;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.planbee.api.common.security.SecurityConfig;
import com.planbee.api.common.security.SecurityProblemResponder;

/**
 * 웹 레이어 슬라이스 테스트. DB가 필요 없으므로 Docker 없이 실행된다.
 * DB가 필요한 테스트에는 {@code @IntegrationTest} 를 쓴다.
 */
@WebMvcTest(HealthController.class)
@Import({ SecurityConfig.class, SecurityProblemResponder.class })
class HealthControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void 헬스체크는_인증_없이_접근할_수_있다() throws Exception {
		mockMvc.perform(get("/api/v1/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.service").value("planbee-api"))
				.andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	void 공개되지_않은_경로는_401과_problem_json을_반환한다() throws Exception {
		mockMvc.perform(get("/api/v1/schedules"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
				.andExpect(jsonPath("$.status").value(401));
	}
}
