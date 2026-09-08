package com.planbee.api.place;

import org.springframework.http.HttpStatus;

import com.planbee.api.common.error.ErrorCode;

/**
 * place 도메인의 에러 코드. 카탈로그는 docs/api/error-codes.md 의 place 절이다 (S-18).
 *
 * <p>{@link #UPSTREAM_UNAVAILABLE} 이 500 인 이유: common.md C-1 이 허용하는 상태 코드에
 * 502/503 이 없다. 상류(카카오·TourAPI) 장애도 결국 "서버가 지금 응답을 완성하지 못했다"
 * 이므로 500 + 전용 {@code code} 로 구분한다.
 */
public enum PlaceErrorCode implements ErrorCode {

	/** `place_id` 에 해당하는 장소가 없거나 공개 상태가 아니다 (AC-PD-3). */
	NOT_FOUND(HttpStatus.NOT_FOUND, "장소가 삭제되었거나 현재 공개되지 않았어요."),

	/** 카카오 로컬 또는 TourAPI 조회 실패 — 상류 5xx · 타임아웃 · 쿼터 초과 (AC-NP-6 / AC-PD-5). */
	UPSTREAM_UNAVAILABLE(HttpStatus.INTERNAL_SERVER_ERROR, "주변 장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");

	private static final String PREFIX = "PLACE_";

	private final HttpStatus status;
	private final String defaultMessage;

	PlaceErrorCode(HttpStatus status, String defaultMessage) {
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
