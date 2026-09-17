/**
 * 시트의 정보 블록 (design.md §6.3 · §7.1).
 *
 * `background` 배경 / 라운드 12 / 패딩 16, 항목은 캡션 라벨 + 값 순서다.
 * <b>값이 없는 항목은 행 자체를 렌더하지 않는다</b> — 빈 값이나 "-" 를 두지 않는다 (§7.1).
 */
import React, {type PropsWithChildren, type ReactNode} from 'react';
import {Text, View} from 'react-native';

export function SheetInfoBlock({children}: PropsWithChildren) {
  return <View className="rounded-[12px] bg-background p-4">{children}</View>;
}

export function SheetInfoRow({
  label,
  value,
  valueSlot,
  selectable = false,
  first = false,
}: {
  label: string;
  value?: string;
  /** 값 자리에 넣을 노드 (상태 배지 등) */
  valueSlot?: ReactNode;
  /** 이메일은 선택·복사 가능하게 둔다 — 관리자가 다른 경로로 확인할 일이 있다 (§6.3) */
  selectable?: boolean;
  first?: boolean;
}) {
  return (
    <View className={first ? '' : 'mt-3'}>
      <Text className="text-caption text-ink-muted">{label}</Text>
      {valueSlot ? (
        <View className="mt-1 flex-row">{valueSlot}</View>
      ) : (
        <Text className="mt-1 text-body text-ink" selectable={selectable}>
          {value}
        </Text>
      )}
    </View>
  );
}
