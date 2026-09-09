package com.planbee.api.admin.dto;

import jakarta.validation.constraints.Size;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거절 요청 본문. <b>본문 전체가 선택이다</b> — 사유를 남기지 않는 거절이 정상 흐름이다 (AC-17).
 *
 * <p>승인 · 거절 취소 · 정지 · 정지 해제에는 요청 본문이 없다. 특히 <b>정지에는 사유 필드를
 * 두지 않는다</b> (2026-09-07 Q3).
 *
 * @param rejectionReason 거절 사유. {@code null} · 빈 문자열 · 필드 생략 모두 정상 200 이고,
 *                        201자 이상이면 400 {@code VALIDATION_FAILED} 다 (AC-16).
 *                        앱이 {@code maxLength=200} 으로 막지만 <b>서버는 앱 검증을 신뢰하지 않고</b>
 *                        같은 제약을 독립적으로 강제한다.
 *                        저장만 하고 어떤 응답으로도 되읽히지 않으며, 거절 취소 시 지워진다
 */
@Schema(type = "object", description = "거절 요청 본문 (전체가 선택)")
public record RejectUserRequest(
		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"string", "null"},
				example = "신청 내용만으로는 서비스 목적에 맞는 사용인지 확인하기 어려웠어요.")
		@Size(max = 200, message = "200자까지 쓸 수 있어요") String rejectionReason) {
}
