/**
 * 문의하기 동작 (design.md §2.7 · §7.5).
 *
 * 메일 앱이 없는 기기가 실제로 있다 — 그때 아무 반응이 없으면 사용자에게는 막다른 길이다.
 * 그래서 열기 전에 `canOpenURL` 로 확인하고, 열 수 없으면 주소를 직접 보여준다 (M-20).
 */
import {useCallback} from 'react';
import {Alert, Linking, Platform} from 'react-native';

import {CONTACT} from '../messages';

export function useContact(email: string | null, subject: string) {
  return useCallback(async () => {
    if (!email) {
      return;
    }
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

    let canOpen = false;
    try {
      canOpen = await Linking.canOpenURL(url);
    } catch {
      canOpen = false;
    }

    if (canOpen) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // 열기에 실패하면 아래 안내로 떨어진다.
      }
    }

    Alert.alert(CONTACT.mailUnavailableTitle, `${CONTACT.mailUnavailableBody}\n\n${email}`, [
      // §7.5 의 "주소 복사" 는 클립보드 모듈이 필요하다. 새 네이티브 의존성은 심사에 영향을 줄 수
      // 있어 임의로 들이지 않는다 (M-19 / 절대 규칙 8) — 지금은 선택 가능한 텍스트로 대신한다.
      // 이 생략의 판단은 ux-designer·사람 대기 중이다: defects.md D-M6 참조.
      // 안드로이드에도 같은 다이얼로그가 뜬다 (Alert 는 양 플랫폼 공용).
      {text: CONTACT.confirm, style: Platform.OS === 'ios' ? 'default' : undefined},
    ]);
  }, [email, subject]);
}
