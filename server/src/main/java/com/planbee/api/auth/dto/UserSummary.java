package com.planbee.api.auth.dto;

import com.planbee.api.auth.UserRole;
import com.planbee.api.auth.UserStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 설정 화면의 "계정" 카드 (design.md §8.2) <b>와 관리자 섹션</b>
 * (admin-user-approval design.md §4)을 함께 그리는 값이다.
 *
 * @param pendingApprovalCount 검토 대기 건수. <b>{@code ADMIN} 에게만 정수이고
 *                             {@code USER} 에게는 {@code null} 이다</b> (admin AC-1 · AC-2 · AC-32).
 *                             관리자 화면을 여는 조건이 {@code role} 이므로 값 자체가 새어 나가면 안 된다.
 *                             앱은 이 값을 그대로 렌더하고 목록 길이로 다시 세지 않는다 (M-18).
 */
@Schema(type = "object", description = "로그인한 계정의 요약 정보")
public record UserSummary(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "email",
				example = "name@example.com") String email,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "USER") UserRole role,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "APPROVED") UserStatus status,
		// OAS 3.1 의 nullable 표기는 타입 배열이다 (AccountStatusView 와 같은 이유).
		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"integer", "null"},
				minimum = "0", example = "3") Integer pendingApprovalCount) {
}
