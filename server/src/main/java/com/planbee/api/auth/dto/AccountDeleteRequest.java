package com.planbee.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 계정 삭제 요청. 본인 확인용 비밀번호 재입력이다 (AC-29).
 *
 * <p>비어 있으면 400 이고 삭제는 실행되지 않는다. 되돌릴 수 없는 동작이라
 * 이 재확인과 화면의 경고 문구(AC-30)가 유일한 안전장치다 — 클라이언트뿐 아니라
 * 서버에서도 독립적으로 보장한다.
 *
 * <p>정책 검증은 하지 않는다. 기존 비밀번호이므로 형식을 따지지 않고 대조만 한다.
 */
@Schema(type = "object", description = "계정 삭제 요청 (비밀번호 재확인)")
public record AccountDeleteRequest(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "planbee2026")
		@NotBlank @Size(max = 72) String password) {
}
