/**
 * "동작 줄이기"(iOS Reduce Motion / Android 애니메이션 제거) 설정.
 *
 * 켜져 있으면 반복 애니메이션을 멈추고 정지 상태로 둔다. `AccessibilityInfo` 가 두 플랫폼 모두에서
 * 같은 API 를 제공하므로 분기가 필요 없다 (M-20 — 분기가 필요한 지점만 분기한다).
 *
 * `shared/ui` 의 디자인 시스템 컴포넌트(`BeeLoader`)가 쓰므로 여기 둔다 — `shared/` 는 `features/` 를
 * import 할 수 없다 (M-2). `features/admin-user-approval/hooks/useReduceMotion.ts` 에 같은 구현이
 * 남아 있다. 그 기능의 재작업이 진행 중이라 이번 변경에서 손대지 않았고, 정리할 때 이 파일로 옮긴다.
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
