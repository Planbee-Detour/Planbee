package com.planbee.api.auth.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 가입 신청 요청.
 *
 * <p><b>앱 검증을 신뢰하지 않는다.</b> AC-3·AC-5·AC-6 은 앱에서 제출 버튼을 비활성으로 막지만,
 * 앱을 우회한 요청이 서버에 도달할 수 있으므로 같은 정책을 여기서 독립적으로 강제한다 (AC-4).
 *
 * @param password           영문과 숫자를 포함해 8자 이상. 상한 72 는 bcrypt 가 73바이트째부터
 *                           무시하기 때문이다 — 상한이 없으면 "72자까지만 실제로 검사되는"
 *                           비밀번호가 생겨 사용자가 아는 정책과 실제 검증이 어긋난다
 * @param signupReason       선택 항목. 비어 있어도 접수된다 (PRD 제약)
 * @param ageOver14Confirmed 만 14세 이상 자기 확인. <b>반드시 true</b> (AC-6)
 */
@Schema(type = "object", description = "가입 신청 요청")
public record SignupRequest(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "email", example = "name@example.com")
		@NotBlank @Email @Size(max = 255) String email,

		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "planbee2026")
		@NotBlank
		@Size(min = 8, max = 72)
		@Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$", message = "영문과 숫자를 포함해 8자 이상")
		String password,

		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"string", "null"},
				example = "주간 계획을 자주 바꾸는 편이라 대안을 추천받고 싶어요.")
		@Size(max = 100) String signupReason,

		@Schema(requiredMode = Schema.RequiredMode.REQUIRED)
		@NotNull @Size(min = 3, max = 3) @Valid List<ConsentInput> consents,

		/*
		 * Jackson 의 SNAKE_CASE 전략은 글자와 숫자 사이에 밑줄을 넣지 않아
		 * ageOver14Confirmed 를 age_over14_confirmed 로 만든다. 계약이 정한 이름은
		 * age_over_14_confirmed 이므로 이 필드만 예외적으로 이름을 명시한다 (S-21 예외).
		 */
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, name = "age_over_14_confirmed", example = "true")
		@JsonProperty("age_over_14_confirmed")
		@NotNull
		@AssertTrue(message = "만 14세 이상만 가입할 수 있어요.") Boolean ageOver14Confirmed) {
}
