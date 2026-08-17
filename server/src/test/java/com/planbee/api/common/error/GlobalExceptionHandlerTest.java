package com.planbee.api.common.error;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 오류 응답 형식(common.md C-1)이 계약대로 유지되는지 검증한다.
 * 모바일이 {@code code} 로 분기하므로, 이 형식이 깨지면 앱의 오류 처리가 통째로 무너진다.
 *
 * <p>보안 필터는 끄고 응답 형식만 본다. 401/403 형식은 HealthControllerTest 가 검증한다.
 */
@WebMvcTest
@Import({ GlobalExceptionHandler.class, GlobalExceptionHandlerTest.TestController.class })
@AutoConfigureMockMvc(addFilters = false)
class GlobalExceptionHandlerTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void 비즈니스_예외는_코드와_함께_problem_json으로_변환된다() throws Exception {
		mockMvc.perform(get("/test/business"))
				.andExpect(status().isNotFound())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.title").value("Not Found"))
				.andExpect(jsonPath("$.detail").value("테스트 리소스를 찾을 수 없습니다."))
				.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

	@Test
	void 검증_실패는_필드별_errors_확장을_포함한다() throws Exception {
		mockMvc.perform(post("/test/validate")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
				.andExpect(jsonPath("$.errors[0].field").value("title"))
				.andExpect(jsonPath("$.errors[0].code").value("NOT_BLANK"))
				.andExpect(jsonPath("$.errors[0].message").isNotEmpty());
	}

	@Test
	void 요청_본문이_깨져도_code가_채워진다() throws Exception {
		mockMvc.perform(post("/test/validate")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{not-json"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
	}

	@RestController
	@RequestMapping("/test")
	static class TestController {

		@org.springframework.web.bind.annotation.GetMapping("/business")
		String business() {
			throw new BusinessException(CommonErrorCode.NOT_FOUND, "테스트 리소스를 찾을 수 없습니다.");
		}

		@PostMapping("/validate")
		String validate(@RequestBody @Valid Payload payload) {
			return payload.title();
		}

		record Payload(@NotBlank(message = "제목을 입력하세요.") String title) {
		}
	}
}
