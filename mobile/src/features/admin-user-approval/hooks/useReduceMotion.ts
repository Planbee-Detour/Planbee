/**
 * "동작 줄이기"(iOS Reduce Motion / Android 애니메이션 제거) 설정.
 *
 * 스켈레톤의 펄스와 항목 제거 애니메이션을 정지 상태로 두는 데 쓴다
 * (design.md §5.7 · §5.11). `AccessibilityInfo` 가 두 플랫폼 모두에서 같은 API 를 제공하므로
 * 분기가 필요 없다 (M-20 — 분기가 필요한 지점만 분기한다).
 */
import {useEffect, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
