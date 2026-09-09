/**
 * `Control/Segmented` (planbee.pen Design System — `Section — Admin List & Sheet`).
 *
 * 한 화면 안에서 목록을 갈아 끼우는 2칸 컨트롤이다
 * (`admin-user-approval` design.md §5.2 / §8.3).
 *
 * <b>네이티브 세그먼트 컴포넌트를 쓰지 않는다</b> (design.md §10). 두 플랫폼의 기본 세그먼트는
 * 높이·라운드·선택 표현이 다르고, 라벨에 숫자를 붙이는 형식("검토 대기 3")을 같은 모양으로
 * 유지할 수 없다. `Feedback/Toast` 가 `ToastAndroid` 를 배제한 것과 같은 판단이다.
 */
import React from 'react';
import {Pressable, Text, View} from 'react-native';

export type SegmentedOption<T extends string> = {
  value: T;
  /** 화면에 그리고 스크린리더가 읽는 라벨. 숫자 접미는 호출부가 붙여서 넘긴다 */
  label: string;
};

type Props<T extends string> = {
  options: SegmentedOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  testID?: string;
};

export function Segmented<T extends string>({options, selected, onSelect, testID}: Props<T>) {
  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      // pen `M4j8Ky`: 높이 44 / `Color/Neutral/Background` / 라운드 12 / 테두리 1 / 패딩 4 / 칸 사이 4
      className="min-h-[44px] flex-row gap-1 rounded-[12px] border border-border bg-background p-1">
      {options.map(option => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{selected: active}}
            onPress={() => onSelect(option.value)}
            testID={testID ? `${testID}-${option.value}` : undefined}
            // 각 칸의 최소 높이 44 — M-10 의 터치 영역 요건 (design.md §3.5)
            className={[
              // pen `M4j8Ky`: 선택 칸 라운드 9 / `Color/Neutral/Surface` + 그림자, 비선택은 투명
              'min-h-[44px] flex-1 items-center justify-center rounded-[9px] px-3',
              active ? 'bg-surface shadow-segment' : '',
            ].join(' ')}>
            {/* 라벨 굵기는 선택 600 / 비선택 500 (pen `Rc3HX` · `M5EjO`) */}
            <Text
              className={`text-body-sm ${active ? 'font-semibold text-ink' : 'font-medium text-ink-muted'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
