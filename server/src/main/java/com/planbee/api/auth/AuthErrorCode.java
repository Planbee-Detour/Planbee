package com.planbee.api.auth;

import org.springframework.http.HttpStatus;

import com.planbee.api.common.error.ErrorCode;

/**
 * auth 도메인의 에러 코드. 카탈로그는 docs/api/error-codes.md 의 auth 절이다 (S-18).
 *
 * <p><b>기본 문구가 계약이다.</b> 모바일은 {@code code} 로 분기하지만 화면에 띄우는 문장은
 * {@code detail} 이므로, 여기 적힌 한국어가 design.md §11.2 의 확정 문구와 같아야 한다.
 *
 * <p>구분해야 하는 것과 같아야 하는 것이 섞여 있으니 주의한다.
 * <ul>
 *   <li><b>같아야 한다</b> — 자격 증명 실패 3종(틀린 비밀번호 / 미등록 / 삭제된 계정)은
 *       {@link #INVALID_CREDENTIALS} 하나다 (AC-12·13·31). 잠금도 계정 존재와 무관하게
 *       {@link #LOGIN_LOCKED} 하나다 (AC-47).</li>
 *   <li><b>달라야 한다</b> — 계정 상태 3종은 화면의 아이콘·색·버튼 구성이 갈리므로
 *       서로 다른 코드다 (AC-14·15·16).</li>
 * </ul>
 */
public enum AuthErrorCode implements ErrorCode {

	// ── 가입 ──────────────────────────────────────────────────────────
	/** AC-2. 가입 화면은 이메일 중복을 그대로 알린다 — 인수된 위험이다 (PRD 제약). */
	EMAIL_ALREADY_REGISTERED(HttpStatus.CONFLICT, "이미 가입 신청된 이메일입니다."),

	/** 가입 IP 레이트 리밋. 대량 자동 열거만 막는 값이라 사람의 가입 흐름에는 닿지 않는다. */
	SIGNUP_RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해 주세요."),

	// ── 로그인 ────────────────────────────────────────────────────────
	/**
	 * AC-12·13·31. 어느 쪽이 틀렸는지 특정하지 않는다 — "계정이 없습니다" 와
	 * "비밀번호가 틀렸습니다" 가 갈리는 순간 계정 존재 여부가 새어 나간다.
	 */
	INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요."),

	/**
	 * AC-17·41·47·48. 남은 시간은 {@code lock_remaining_minutes} 확장 필드로 함께 나간다 —
	 * 문구에 수치를 박지 않는다 (design.md §4.7).
	 */
	LOGIN_LOCKED(HttpStatus.TOO_MANY_REQUESTS, "로그인을 잠시 제한했어요."),

	/** AC-14. 화면 문구는 {@code account_status} 가 싣고 오며 여기 detail 은 표시되지 않는다. */
	ACCOUNT_PENDING(HttpStatus.FORBIDDEN, "가입 신청을 검토하고 있어요."),

	/** AC-15. 응답에 {@code deletion_token} 이 함께 실린다 (AC-50). */
	ACCOUNT_REJECTED(HttpStatus.FORBIDDEN, "가입이 승인되지 않았어요."),

	/** AC-16. 정지 회피를 막기 위해 {@code deletion_token} 을 싣지 않는다. */
	ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "이용이 정지된 계정이에요."),

	// ── 세션 ──────────────────────────────────────────────────────────
	/** AC-25. 마지막 사용(로그인 또는 갱신)에서 14일이 지났다. 앱은 만료 배너를 띄운다. */
	REFRESH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요."),

	/** AC-23. 알 수 없는 토큰·형식 오류·로그아웃으로 폐기된 토큰. 앱은 만료 배너를 띄운다. */
	REFRESH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요."),

	/**
	 * AC-23·24. 유예 창을 넘긴 재사용. <b>이 응답이 계정 전체 폐기의 방아쇠다.</b>
	 * 앱은 보안 배너를 띄운다.
	 */
	REFRESH_TOKEN_REUSED(HttpStatus.UNAUTHORIZED, "보안을 위해 모든 기기에서 로그아웃했어요. 다시 로그인해 주세요."),

	/** AC-24. 재사용 감지로 이미 폐기된 계정의 토큰 — 다른 기기가 받는 응답이다. */
	REFRESH_TOKEN_REVOKED(HttpStatus.UNAUTHORIZED, "보안을 위해 모든 기기에서 로그아웃했어요. 다시 로그인해 주세요."),

	// ── 계정 삭제 ─────────────────────────────────────────────────────
	/**
	 * AC-29. 401 이지만 <b>세션 문제가 아니다.</b> 앱은 토큰 갱신을 시도하지 말고
	 * 비밀번호 필드 오류로 표시해야 한다 (design.md §9.4). 분기는 상태 코드가 아니라 code 로 한다.
	 */
	PASSWORD_MISMATCH(HttpStatus.UNAUTHORIZED, "비밀번호를 확인해 주세요.");

	/** 카탈로그의 코드 문자열은 도메인 접두어를 붙인다 (common.md C-1). */
	private static final String PREFIX = "AUTH_";

	private final HttpStatus status;
	private final String defaultMessage;

	AuthErrorCode(HttpStatus status, String defaultMessage) {
		this.status = status;
		this.defaultMessage = defaultMessage;
	}

	@Override
	public String code() {
		return PREFIX + name();
	}

	@Override
	public HttpStatus status() {
		return status;
	}

	@Override
	public String defaultMessage() {
		return defaultMessage;
	}
}
