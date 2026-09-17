package com.planbee.api.admin.dto;

import java.time.Instant;

import com.planbee.api.auth.UserStatus;

/**
 * 처리 완료 목록 조회 전용 프로젝션 (S-26).
 * 상태 라벨·접두어·{@code is_me} 는 서비스가 붙인다 ({@link PendingUserRow} 와 같은 이유).
 */
public record ProcessedUserRow(
		Long userId,
		String email,
		UserStatus status,
		Instant processedAt,
		Instant approvedAt,
		Instant suspendedAt,
		Instant rejectedAt) {
}
