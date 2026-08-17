package com.planbee.api.common.error;

/**
 * 검증 실패 시 ProblemDetail 의 {@code errors} 확장에 담기는 항목.
 *
 * @param field   실패한 필드명
 * @param code    제약 조건 코드 (예: NOT_BLANK) — 모바일이 분기에 사용
 * @param message 사용자에게 보여줄 문구
 */
public record FieldErrorDetail(String field, String code, String message) {
}
