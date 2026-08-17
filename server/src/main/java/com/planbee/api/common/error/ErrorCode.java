package com.planbee.api.common.error;

import org.springframework.http.HttpStatus;

/**
 * 도메인 에러 코드의 계약. 각 도메인은 자기 패키지에 enum 을 만들어 이 인터페이스를 구현한다.
 * 예: {@code com.planbee.api.schedule.ScheduleErrorCode}
 *
 * <p>코드 문자열은 모바일이 분기 조건으로 사용하므로 함부로 바꾸지 않는다.
 * 새 코드를 추가하면 docs/api/error-codes.md 에도 반드시 등록한다. (common.md C-1)
 */
public interface ErrorCode {

	/** 모바일이 분기하는 기계용 식별자. UPPER_SNAKE_CASE, 도메인 접두어 사용. */
	String code();

	HttpStatus status();

	/** 사용자에게 보여도 되는 기본 문구. 내부 정보를 담지 않는다. */
	String defaultMessage();
}
