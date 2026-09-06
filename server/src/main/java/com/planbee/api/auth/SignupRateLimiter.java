package com.planbee.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * 가입 신청의 IP 단위 레이트 리밋.
 *
 * <p>가입 화면은 이메일 중복을 그대로 알려주므로(AC-2) 계정 열거에 쓰일 수 있다.
 * 메일 발송 인프라가 없어 그 노출 자체는 <b>인수된 위험</b>이고(PRD 제약),
 * 이 리밋이 막는 것은 <b>대량 자동 열거</b>뿐이다. 사람이 손으로 가입하는 흐름에는 닿지 않는 값이다.
 *
 * <p>이 비대칭은 의도된 것이며, 로그인 쪽 보호(AC-13·AC-47)를 약화시키는 근거로 쓰지 않는다.
 *
 * <p><b>저장소는 프로세스 메모리다 (S-29).</b> 집계 창이 1시간짜리 <b>휘발 상태</b>라
 * DB 에 넣을 이유가 없다 — 요청마다 쓰기가 발생하는데 남길 가치는 없고(감사 대상이 아니다),
 * 재기동으로 초기화돼도 정책이 무너지지 않는다. 최악이 "재기동 직후 그 IP 가 한도만큼 다시
 * 시도할 수 있는 것"이고, 이 리밋이 막으려는 것은 사람이 아니라 <b>대량 자동 열거</b>라
 * 재기동을 노려 창을 초기화하는 것으로는 그 규모가 나오지 않는다.
 *
 * <p>서버를 여러 대로 늘리면 이 상태를 공유 저장소로 옮겨야 한다 — 옮기지 않으면 한도가
 * 인스턴스 수만큼 느슨해진다. status.md 의 배포 전 확인 항목에 적어 두었다.
 */
@Component
public class SignupRateLimiter {

	private final AuthProperties.RateLimit policy;
	private final Clock clock;
	/** 집계 키(요청 IP) → 현재 창. 프로세스 메모리인 이유는 클래스 주석 참조 (S-29). */
	private final Map<String, Window> windowsByClient = new ConcurrentHashMap<>();

	public SignupRateLimiter(AuthProperties properties, Clock clock) {
		this.policy = properties.signupRateLimit();
		this.clock = clock;
	}

	/**
	 * 요청 1건을 세고, 한도를 넘었으면 남은 대기 시간을 돌려준다.
	 *
	 * @return 비어 있으면 통과, 값이 있으면 그만큼 기다려야 한다
	 */
	public Optional<Duration> registerAndCheck(String clientKey) {
		Instant now = clock.instant();
		Window window = windowsByClient.compute(clientKey, (key, existing) -> {
			boolean withinWindow = existing != null && now.isBefore(existing.startedAt.plus(policy.window()));
			return withinWindow
					? new Window(existing.count + 1, existing.startedAt)
					: new Window(1, now);
		});

		if (window.count <= policy.maxAttempts()) {
			return Optional.empty();
		}
		return Optional.of(Duration.between(now, window.startedAt.plus(policy.window())));
	}

	private record Window(int count, Instant startedAt) {
	}
}
