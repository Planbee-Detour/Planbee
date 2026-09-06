package com.planbee.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * 로그인 실패 잠금 (AC-17 · AC-47 · AC-48).
 *
 * <p><b>카운터의 키는 계정이 아니라 정규화된 이메일 문자열이다.</b> 계정 단위로만 세면
 * 등록된 이메일은 잠금 응답을, 미등록 이메일은 자격 증명 오류를 받는다 — 잠금 여부로
 * 계정 존재가 새어 나가 AC-13 이 무력해진다 (2026-08-25 확정). 그래서 계정이 없어도
 * 같은 규칙으로 세고 같은 응답을 낸다 (AC-47).
 *
 * <p><b>저장소는 프로세스 메모리다.</b> PRD 제약이 "TTL 캐시" 로 지정한 대로이며,
 * 잠금은 최대 10분짜리 임시 상태라 재기동으로 사라져도 정책이 무너지지 않는다
 * (재기동으로 잠금이 풀리는 쪽이, 잠금 기록이 DB 에 영구히 쌓이는 쪽보다 낫다).
 * 서버를 여러 대로 늘리면 이 상태를 공유 저장소로 옮겨야 한다 —
 * status.md 의 배포 전 확인 항목에 적어 두었다.
 */
@Component
public class LoginAttemptGuard {

	private final AuthProperties.LoginLock policy;
	private final Clock clock;
	private final Map<String, Attempts> attemptsByEmail = new ConcurrentHashMap<>();

	public LoginAttemptGuard(AuthProperties properties, Clock clock) {
		this.policy = properties.loginLock();
		this.clock = clock;
	}

	/**
	 * 잠겨 있으면 남은 시간을 돌려준다.
	 *
	 * <p>호출부는 이걸 <b>비밀번호 검증보다 먼저</b> 확인해야 한다 (AC-48). 그래야
	 * ① 잠금 중 재시도가 카운터를 늘리지 않아 "기다리면 풀린다" 는 안내가 거짓말이 되지 않고,
	 * ② bcrypt 연산을 아끼며,
	 * ③ 잠긴 계정과 그렇지 않은 계정의 응답 시간 차이도 생기지 않는다.
	 */
	public Optional<Duration> lockRemaining(String normalizedEmail) {
		Attempts attempts = attemptsByEmail.get(normalizedEmail);
		if (attempts == null || attempts.lockedUntil == null) {
			return Optional.empty();
		}
		Instant now = clock.instant();
		if (!now.isBefore(attempts.lockedUntil)) {
			// 잠금이 끝났다. 카운터도 함께 초기화한다 — 다음 실패는 1회부터 센다.
			attemptsByEmail.remove(normalizedEmail);
			return Optional.empty();
		}
		return Optional.of(Duration.between(now, attempts.lockedUntil));
	}

	/** 로그인 실패 1회를 센다. 임계값에 닿으면 잠근다. */
	public void recordFailure(String normalizedEmail) {
		Instant now = clock.instant();
		attemptsByEmail.compute(normalizedEmail, (key, existing) -> {
			// 창을 벗어난 실패는 이어서 세지 않는다 — "연속 5회" 의 연속을 창이 정의한다.
			boolean withinWindow = existing != null
					&& now.isBefore(existing.firstFailureAt.plus(policy.window()));

			int count = withinWindow ? existing.count + 1 : 1;
			Instant firstFailureAt = withinWindow ? existing.firstFailureAt : now;
			Instant lockedUntil = count >= policy.maxAttempts() ? now.plus(policy.duration()) : null;

			return new Attempts(count, firstFailureAt, lockedUntil);
		});
	}

	/** 로그인에 성공하면 카운터를 지운다. */
	public void reset(String normalizedEmail) {
		attemptsByEmail.remove(normalizedEmail);
	}

	/**
	 * 남은 시간을 분으로 <b>올림하고 최소 1분</b>을 보장한다 (PRD 제약).
	 *
	 * <p>30초가 남았을 때 "약 0분" 은 "지금 되는데 안 되네" 가 된다. 실제보다 짧게 말하지 않는다.
	 */
	public static int toRemainingMinutes(Duration remaining) {
		long minutes = (remaining.toSeconds() + 59) / 60;
		return (int) Math.max(1, minutes);
	}

	private record Attempts(int count, Instant firstFailureAt, Instant lockedUntil) {
	}
}
