package com.planbee.api.admin.dto;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 처리 완료 목록의 한 행이자 <b>사용자 상세 시트 전체</b>다 (design.md §5.4 · §7.1).
 * {@code APPROVED} · {@code SUSPENDED} · {@code REJECTED} 세 상태가 이 하나를 쓴다.
 *
 * <p><b>처리자도, 거절 사유도, 정지 사유도 담지 않는다.</b> 화면에 그리지 않기로 확정됐으므로
 * 응답에 실을 이유가 없다 (2026-09-07 Q2 · Q3).
 *
 * @param statusLabel        상태 배지 문자열. 서버가 내린다 (C-8)
 * @param processedAt        마지막으로 상태가 바뀐 시각. 이 목록의 정렬 키다.
 *                           언제나 같은 상태의 시각 필드와 값이 같다
 * @param processedAtPrefix  목록 행에서 {@code processedAt} 앞에 붙이는 문자열
 * @param approvedAt         승인 시각. <b>{@code REJECTED} 에서는 {@code null}</b> 이다 —
 *                           거절은 {@code PENDING} 에서만 일어나므로 승인된 적이 없다.
 *                           앱은 값이 {@code null} 인 행을 아예 렌더하지 않는다
 * @param suspendedAt        정지 시각. {@code SUSPENDED} 일 때만 값이 있다
 * @param rejectedAt         거절 시각. {@code REJECTED} 일 때만 값이 있다
 * @param isMe               로그인한 관리자 자신인가 (AC-25). {@code true} 면 앱이 액션 버튼을
 *                           렌더하지 않는다. 다만 <b>차단은 서버가</b> 403 으로 한다
 */
@Schema(type = "object", description = "처리 완료 목록의 한 행 (= 사용자 상세 시트 전체)")
public record ProcessedUserItem(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "7") long userId,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "email",
				example = "hana@example.com") String email,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "APPROVED") ProcessedStatus status,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "승인됨") String statusLabel,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "date-time",
				example = "2026-09-01T00:12:00Z") Instant processedAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "승인") String processedAtPrefix,
		// OAS 3.1 의 nullable 은 타입 배열이다 (auth 의 AccountStatusView 와 같은 이유).
		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"string", "null"},
				format = "date-time", example = "2026-09-01T00:12:00Z") Instant approvedAt,
		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"string", "null"},
				format = "date-time") Instant suspendedAt,
		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"string", "null"},
				format = "date-time") Instant rejectedAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "false") boolean isMe) {
}
