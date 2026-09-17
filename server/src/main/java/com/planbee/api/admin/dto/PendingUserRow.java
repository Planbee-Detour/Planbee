package com.planbee.api.admin.dto;

import java.time.Instant;

/**
 * 검토 대기 목록 조회 전용 프로젝션 (S-26).
 *
 * <p>응답 DTO({@link PendingUserItem})와 나눈 이유는 두 가지가 응답에서만 정해지기 때문이다 —
 * 가입 사유의 대체 문구와 {@code is_me} 판정이다. 둘 다 한국어 문구·요청자 식별이 필요한
 * <b>표시</b>의 문제라 조회가 아니라 서비스에서 붙인다. 조회에 섞으면 SQL 에 한국어 리터럴이 들어간다.
 *
 * @param signupReason 원본 값. 비어 있을 수 있다 (auth 의 선택 항목)
 */
public record PendingUserRow(Long userId, String email, String signupReason, Instant requestedAt) {
}
