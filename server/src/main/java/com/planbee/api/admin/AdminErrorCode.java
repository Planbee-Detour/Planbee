package com.planbee.api.admin;

import org.springframework.http.HttpStatus;

import com.planbee.api.common.error.ErrorCode;

/**
 * admin 도메인의 에러 코드. 카탈로그는 docs/api/error-codes.md 의 admin 절이다 (S-18).
 *
 * <p><b>세 개뿐이다.</b> 나머지는 공통 코드를 그대로 쓴다 — 미인증은 {@code UNAUTHORIZED}(AC-4),
 * 대상 없음은 {@code NOT_FOUND}, 페이지 파라미터 오류는 {@code VALIDATION_FAILED} /
 * {@code MALFORMED_REQUEST}, 거절 사유 200자 초과는 {@code VALIDATION_FAILED} 다 (AC-16).
 * 코드를 늘리는 기준은 "앱이 그리는 화면이 갈리는가" 하나다 (C-1).
 *
 * <p>{@code defaultMessage} 는 계약의 예시 {@code detail} 과 같은 문장이어야 한다 —
 * 앱은 {@code code} 로 분기하지만 화면에 띄우는 문장은 {@code detail} 이다.
 */
public enum AdminErrorCode implements ErrorCode {

	/**
	 * AC-3. 역할이 {@code ADMIN} 이 아니다. 앱은 목록 화면의 <b>권한 없음 블록</b>을 그린다.
	 *
	 * <p>공통 {@code FORBIDDEN} 과 갈라 쓰는 이유는 앱이 그리는 것이 화면 전체와 일반 오류 문구로
	 * 서로 다르기 때문이다. 호출한 엔드포인트로 분기하면 분기 근거가 {@code code} 밖으로 나간다.
	 */
	FORBIDDEN(HttpStatus.FORBIDDEN, "관리자만 사용할 수 있어요."),

	/**
	 * AC-25. 관리자가 자기 계정을 정지하려 했다. 앱은 {@code is_me} 로 버튼을 아예 렌더하지
	 * 않으므로 정상 경로에서는 도달하지 않지만, <b>차단의 주체는 서버다</b>.
	 */
	SELF_SUSPEND_FORBIDDEN(HttpStatus.FORBIDDEN, "내 계정은 정지할 수 없어요."),

	/**
	 * AC-12. 전제 상태와 다른 상태에서 상태 전이를 시도했다 — 대개 다른 기기가 먼저 처리한 경우다.
	 * <b>상태 전이 5종이 이 코드 하나를 공유한다.</b> 현재 상태를 응답에 담지 않는다 —
	 * 앱이 어차피 목록을 다시 불러오므로 담으면 진실이 둘이 된다.
	 */
	USER_ALREADY_PROCESSED(HttpStatus.CONFLICT, "이미 처리된 신청이에요.");

	/** 카탈로그의 코드 문자열은 도메인 접두어를 붙인다 (common.md C-1). */
	private static final String PREFIX = "ADMIN_";

	private final HttpStatus status;
	private final String defaultMessage;

	AdminErrorCode(HttpStatus status, String defaultMessage) {
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
