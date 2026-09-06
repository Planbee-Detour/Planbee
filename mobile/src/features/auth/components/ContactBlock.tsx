/**
 * 문의 블록 — 네 화면이 공유하는 패턴 (design.md §2.7 / AC-38~45).
 *
 * <b>주소가 없을 때(AC-43)가 이 컴포넌트의 존재 이유다.</b> 주소 행과 "문의하기" 를 지우고
 * 그 자리에 대체 안내 한 줄만 남긴다. 빈 줄이나 회색 자리표시자를 남기지 않고,
 * 오류로 처리하지도 않는다 — 사용자 입장에서는 "문의 창구가 아직 없는 정상 화면" 이다 (AC-44).
 *
 * 그래서 이 판단을 화면마다 반복하지 않고 여기 한 곳에 둔다 — 네 화면의 대체 문구가
 * 글자 하나라도 달라지면 사용자가 같은 상황을 두 번 확인하게 된다.
 */
import React from 'react';
import {Text, View} from 'react-native';

import {Button} from '../../../shared/ui/Button';
import {ContactRow} from '../../../shared/ui/ContactRow';
import {useContact} from '../hooks/useContact';
import {CONTACT} from '../messages';

type Props = {
  /** 서버가 내려준 값. `null` 이면 대체 안내로 바뀐다 */
  email: string | null;
  /** 메일 제목. 화면마다 다르다 (§11.2.1) */
  subject: string;
  /** 행이 놓이는 자리. 배경색이 뒤집힌다 (§2.7.2) */
  on: 'screen' | 'card';
  /**
   * `REJECTED`·`SUSPENDED` 는 카드 안에 `Button/Secondary` 를 한 번 더 두어 액션의 무게를 높인다.
   * `PENDING` 과 잠금 배너는 행 안의 텍스트 버튼만 쓴다 (§2.7.2).
   */
  withSecondaryButton?: boolean;
};

export function ContactBlock({email, subject, on, withSecondaryButton = false}: Props) {
  const onContact = useContact(email, subject);

  if (!email) {
    return (
      <Text className="text-caption text-ink-muted" accessibilityRole="text">
        {CONTACT.unavailable}
      </Text>
    );
  }

  return (
    <View>
      <ContactRow email={email} onContact={onContact} on={on} actionLabel={CONTACT.action} />
      {withSecondaryButton ? (
        <View className="mt-3">
          <Button label={CONTACT.action} variant="secondary" onPress={onContact} />
        </View>
      ) : null}
    </View>
  );
}
