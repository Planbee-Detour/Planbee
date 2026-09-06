package com.planbee.api.auth;

import java.time.Duration;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * auth 정책 수치. 값의 근거는 PRD 제약 절과 contract.yaml 에 있다.
 *
 * <p>수치를 설정으로 뺀 이유: 화면 문구에 "10분" 이나 "5회" 를 박지 않기로 했으므로
 * (design.md §4.7 — 공격자에게 임계값을 알려줄 이유가 없고, 값이 바뀌어도 문구를 고칠 필요가 없어야 한다)
 * 여기를 바꾸면 그걸로 끝나야 한다.
 *
 * @param supportContactEmail 상태 안내 3종과 잠금 응답에 실어 보낼 문의 주소 (AC-38~43).
 *                            <b>비어 있는 것이 정상 상태다</b> — 그때는 응답에 {@code null} 이
 *                            나가고 앱이 대체 안내로 바꾼다 (AC-43·AC-44). 기동을 막지 않는다
 * @param loginLock           로그인 실패 잠금 (AC-17)
 * @param refreshGraceWindow  리프레시 회전 유예 창 (AC-49)
 * @param deletionTokenTtl    거절 계정에 발급하는 삭제 전용 토큰의 수명 (AC-50)
 * @param signupRateLimit     가입 IP 레이트 리밋
 */
@Validated
@ConfigurationProperties(prefix = "planbee.auth")
public record AuthProperties(
		@DefaultValue("") String supportContactEmail,
		@NotNull @DefaultValue LoginLock loginLock,
		@DefaultValue("10s") Duration refreshGraceWindow,
		@DefaultValue("10m") Duration deletionTokenTtl,
		@NotNull @DefaultValue RateLimit signupRateLimit) {

	/**
	 * 설정값이 비었으면 {@code null} 을 돌려준다 — 응답에 빈 문자열이 나가면 앱이
	 * "주소가 있다" 고 판단해 빈 주소 행을 그리게 된다 (AC-43 이 요구하는 것은 그 반대다).
	 */
	public String supportContactEmailOrNull() {
		return supportContactEmail == null || supportContactEmail.isBlank() ? null : supportContactEmail.strip();
	}

	/**
	 * @param maxAttempts 이 횟수만큼 <b>연속</b> 실패하면 잠근다
	 * @param window      실패를 세는 창. 이 시간 안의 실패만 누적된다
	 * @param duration    잠금이 유지되는 시간
	 */
	public record LoginLock(
			@Min(1) @DefaultValue("5") int maxAttempts,
			@DefaultValue("10m") Duration window,
			@DefaultValue("10m") Duration duration) {
	}

	/**
	 * @param maxAttempts 창 안에서 허용하는 최대 요청 수
	 * @param window      집계 창
	 */
	public record RateLimit(
			@Min(1) @DefaultValue("10") int maxAttempts,
			@DefaultValue("1h") Duration window) {
	}
}
