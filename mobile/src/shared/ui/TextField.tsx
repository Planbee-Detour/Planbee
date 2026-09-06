/**
 * `Input/TextField` (planbee.pen Design System) — 기본 · 오류 · 비활성 3상태.
 *
 * 오류 표현은 design.md §2.4 의 3단계 중 "필드 오류" 다.
 * 연한 빨강 배경 토큰을 새로 만들지 않고 `surface` + `danger` 테두리로 표현한다 (2026-08-23 결정).
 */
import React, {forwardRef, useState, type ReactNode} from 'react';
import {Pressable, Text, TextInput, View, type TextInputProps} from 'react-native';

import {COLOR} from './tokens';

type Props = Omit<TextInputProps, 'className'> & {
  /**
   * 라벨 텍스트. 입력란의 `accessibilityLabel` 이 되기도 한다 (design.md §2.5) —
   * <b>플레이스홀더 문장을 여기에 넘기지 않는다.</b>
   */
  label: string;
  /** 라벨 우측에 붙는 표식. 예: 가입 사유의 "선택" 배지 (design.md §5.3) */
  labelBadge?: ReactNode;
  /** 필드 아래 오류 문구. 있으면 테두리도 danger 로 바뀐다 */
  errorMessage?: string;
  /** 오류가 아닌 도움말. 오류가 있으면 오류가 우선한다 */
  helpText?: string;
  /** 비밀번호 입력에 표시/숨김 토글을 붙인다 */
  secureToggle?: boolean;
  /** 글자 수 표시 "12/100" (design.md §5.3) */
  counter?: {current: number; max: number};
};

export const TextField = forwardRef<TextInput, Props>(function TextFieldBase(
  {label, labelBadge, errorMessage, helpText, secureToggle = false, counter, ...inputProps},
  ref,
) {
  const [revealed, setRevealed] = useState(false);
  const hasError = Boolean(errorMessage);
  // 제출 중에는 화면이 editable={false} 를 넘긴다 — RN 표준 prop 을 그대로 쓰고
  // 비활성 표현만 여기서 붙인다.
  const disabled = inputProps.editable === false;

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-body-sm font-semibold text-ink">{label}</Text>
          {labelBadge ? <View className="ml-2">{labelBadge}</View> : null}
        </View>
        {counter ? (
          <Text className="text-caption text-ink-muted">{`${counter.current}/${counter.max}`}</Text>
        ) : null}
      </View>

      <View
        className={[
          'mt-2 min-h-[52px] flex-row items-center rounded-input border px-4',
          disabled ? 'bg-background border-border' : 'bg-surface',
          hasError ? 'border-danger' : disabled ? 'border-border' : 'border-border',
        ].join(' ')}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          // 오류 문구는 필드와 함께 읽혀야 한다. 아래 Text 만 두면 포커스 시 낭독되지 않는다.
          accessibilityHint={errorMessage ?? helpText}
          // `placeholderTextColor` 는 className 을 받지 않는다 — `text-ink-muted` 와 같은
          // 토큰 값을 코드에서 읽어 온다 (M-16).
          placeholderTextColor={COLOR.inkMuted}
          secureTextEntry={secureToggle ? !revealed : inputProps.secureTextEntry}
          className="flex-1 text-body text-ink"
          {...inputProps}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? '비밀번호 숨기기' : '비밀번호 표시'}
            onPress={() => setRevealed(current => !current)}
            hitSlop={12}
            className="ml-2 min-h-[44px] min-w-[44px] items-center justify-center">
            <Text className="text-caption text-ink-muted">{revealed ? '숨기기' : '표시'}</Text>
          </Pressable>
        ) : null}
      </View>

      {hasError ? (
        <Text className="mt-2 text-caption text-danger">{errorMessage}</Text>
      ) : helpText ? (
        <Text className="mt-2 text-caption text-ink-muted">{helpText}</Text>
      ) : null}
    </View>
  );
});
