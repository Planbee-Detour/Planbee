package com.planbee.api.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * 테스트가 시각을 직접 움직일 수 있게 하는 {@link Clock}.
 *
 * <p>auth 의 판정 절반이 시각에 걸려 있다 — 잠금 10분, 유예 창 10초, 리프레시 유휴 만료 14일,
 * 삭제 토큰 10분. 실제 시간을 기다려서는 검증할 수 없고 {@code Thread.sleep} 으로 흉내 내면
 * 테스트가 느려지면서 동시에 불안정해진다. 그래서 시각을 주입해 앞으로 감는다
 * (`server.md` S-8 / 역할 정의 "시각에 의존하는 로직은 고정 시각을 주입한다").
 *
 * <p><b>기준 시각은 실제 현재 시각에서 시작한다.</b> 과거의 고정 시각으로 두면 그때 발급된
 * 액세스 토큰의 {@code exp} 가 이미 지나 있어 — JWT 검증은 이 시계가 아니라 시스템 시계를
 * 쓴다 — 인증이 필요한 요청이 전부 401 이 된다. 앞으로만 감으면 그 문제가 생기지 않는다.
 */
public final class MutableClock extends Clock {

	private final ZoneId zone;
	private volatile Instant instant;

	public MutableClock(Instant initial, ZoneId zone) {
		this.instant = initial;
		this.zone = zone;
	}

	public static MutableClock startingNow() {
		return new MutableClock(Instant.now(), ZoneOffset.UTC);
	}

	/** 테스트 하나가 끝나면 다음 테스트에 시각이 새어 나가지 않도록 되감는다. */
	public void resetToNow() {
		this.instant = Instant.now();
	}

	public void advance(Duration amount) {
		this.instant = this.instant.plus(amount);
	}

	/**
	 * 뒤로 감는다. <b>이미 만료된 토큰</b>을 만들 때만 쓴다 — JWT 검증은 이 시계가 아니라
	 * 시스템 시계를 보므로, 과거 시각으로 발급해야 검증이 실패하는 상황을 재현할 수 있다.
	 */
	public void rewind(Duration amount) {
		this.instant = this.instant.minus(amount);
	}

	@Override
	public Instant instant() {
		return instant;
	}

	@Override
	public ZoneId getZone() {
		return zone;
	}

	@Override
	public Clock withZone(ZoneId newZone) {
		return new MutableClock(instant, newZone);
	}
}
