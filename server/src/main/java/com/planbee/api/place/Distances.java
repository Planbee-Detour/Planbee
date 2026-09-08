package com.planbee.api.place;

/**
 * 거리(m)를 화면 문구로 바꾼다. 파생값은 서버가 만든다 (C-8) — 앱이 "850m" 나 "도보 12분" 을
 * 계산하지 않는다.
 *
 * <p>도보 시간은 평지 기준 시속 4.5km(= 분당 75m)로 어림한다. 정확한 경로 소요시간이 아니라
 * "가까운지" 를 가늠하는 값이다.
 */
final class Distances {

	private static final double WALK_METERS_PER_MINUTE = 75.0;

	private Distances() {
	}

	/** 예: 850 → "850m · 도보 12분", 1240 → "1.2km · 도보 17분". */
	static String label(int meters) {
		int walkMinutes = Math.max(1, (int) Math.round(meters / WALK_METERS_PER_MINUTE));
		return "%s · 도보 %d분".formatted(distance(meters), walkMinutes);
	}

	private static String distance(int meters) {
		if (meters < 1000) {
			return meters + "m";
		}
		return "%.1fkm".formatted(meters / 1000.0);
	}
}
