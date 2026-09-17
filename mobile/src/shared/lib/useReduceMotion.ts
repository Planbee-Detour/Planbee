/**
 * "동작 줄이기"(iOS Reduce Motion / Android 애니메이션 제거) 설정.
 *
 * 켜져 있으면 반복 애니메이션을 멈추고 정지 상태로 둔다. `AccessibilityInfo` 가 두 플랫폼 모두에서
 * 같은 API 를 제공하므로 분기가 필요 없다 (M-20 — 분기가 필요한 지점만 분기한다).
 *
 * `shared/ui` 의 `BeeLoader` 와 `admin-user-approval` 의 `ListSkeleton` 이 함께 쓴다. 두 곳 이상이 쓰므로
 * `shared/` 에 둔다 (M-3) — `shared/` 는 `features/` 를 import 할 수 없다 (M-2).
 */
import {useEffect, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (mounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
