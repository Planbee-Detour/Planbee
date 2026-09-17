package com.planbee.api.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * <b>거절 취소의 성공 응답</b> (AC-19). 결과 상태가 {@code PENDING} 이라 {@code user} 가
 * {@link PendingUserItem} 이다. 이 계약에서 처리 완료 → 검토 대기 방향은 이것 하나뿐이다.
 *
 * <p>{@link ProcessedUserActionResult} 와 합치지 않는다 — 합치면 둘 중 하나가 반드시
 * nullable {@code $ref} 가 되는데, springdoc 이 그것을 계약과 같은 모양으로 생성하지 못한다
 * (계약 말미 "계약 표현의 제약" 3).
 *
 * @param pendingApprovalCount 거절 취소로 <b>1 늘어난</b> 검토 대기 건수. 앱이 더하지 않는다
 * @param user                 검토 대기 목록에 다시 들어갈 항목.
 *                             {@code requested_at} 은 원래 신청 시각이다
 */
@Schema(type = "object", description = "거절 취소 결과 (결과 상태가 검토 대기)")
public record PendingUserActionResult(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0",
				example = "4") int pendingApprovalCount,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) PendingUserItem user) {
}
