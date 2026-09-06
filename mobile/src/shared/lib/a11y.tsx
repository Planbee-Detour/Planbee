/**
 * 스크린리더 낭독 — <b>양쪽 플랫폼 경로를 모두 구현한다</b> (mobile.md M-20).
 *
 * `design.md` §12 가 이 지점을 플랫폼 분기로 지정했다.
 *
 * | 플랫폼 | 방식 |
 * |---|---|
 * | iOS (VoiceOver) | `AccessibilityInfo.announceForAccessibility` 를 **직접 호출**해야 읽는다 |
 * | Android (TalkBack) | `accessibilityLiveRegion="polite"` 가 붙은 뷰를 시스템이 스스로 읽는다 |
 *
 * 그래서 낭독이 필요한 곳은 두 가지를 함께 쓴다 — 뷰에 {@link LIVE_REGION_POLITE} 를 펼치고,
 * 같은 문장으로 {@link useAnnounceForAccessibility} 를 부른다. 안드로이드에서 훅이 아무 일도
 * 하지 않는 이유는 시스템이 이미 읽었기 때문이다(중복 낭독 방지).
 *
 * 대상: 오류 배너(§2.5) · 토스트(§4.3) · 스플래시 진입(§3.5).
 */
import {useEffect} from 'react';
import {AccessibilityInfo, Platform, View} from 'react-native';

/**
 * 안드로이드 측 경로. `accessibilityLiveRegion` 은 안드로이드 전용 prop 이고
 * iOS 에서는 무시되므로 분기 없이 그대로 펼쳐 써도 된다.
 */
export const LIVE_REGION_POLITE = {accessibilityLiveRegion: 'polite'} as const;

/**
 * iOS 측 경로. `message` 가 바뀔 때마다 한 번 읽는다.
 *
 * `Platform.select` 의 `default` 를 반드시 채운다 (M-20) — 비워 두면 안드로이드에서
 * `undefined` 가 흘러 호출부가 죽는다.
 */
const announce = Platform.select({
  ios: (message: string) => AccessibilityInfo.announceForAccessibility(message),
  // 안드로이드·그 외: 라이브 리전이 담당한다. 여기서 또 부르면 같은 문장을 두 번 읽는다.
  default: (_message: string) => undefined,
});

export function useAnnounceForAccessibility(message: string | null | undefined): void {
  useEffect(() => {
    if (!message) {
      return;
    }
    announce(message);
  }, [message]);
}

/**
 * 화면에 보이는 요소 없이 문장만 읽어야 할 때 쓴다 (예: 스플래시 진입 안내 §3.5).
 *
 * 레이아웃을 밀지 않도록 크기를 0 으로 둔다. 안드로이드는 이 뷰의 라이브 리전이,
 * iOS 는 위 훅이 읽는다.
 */
export function A11yAnnouncement({message}: {message: string}) {
  useAnnounceForAccessibility(message);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={message}
      {...LIVE_REGION_POLITE}
      pointerEvents="none"
      className="h-0 w-0 overflow-hidden"
    />
  );
}
