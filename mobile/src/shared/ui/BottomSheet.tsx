/**
 * `Layout/BottomSheet` (planbee.pen Design System — `Section — Admin List & Sheet`).
 *
 * 시트 크롬(스크림 + 핸들 바 + 내용 슬롯)만 담당한다. 내용은 호출부가 넣는다
 * (`admin-user-approval` design.md §6.1 · §6.2 · §8.3).
 *
 * <b>새 애니메이션·시트 라이브러리를 들이지 않는다.</b> RN `Modal` + `Animated` 로만 만든다 —
 * 서드파티 SDK 도입은 심사에 영향을 주는 결정이라 사람에게 물어야 하고
 * (M-19 / 절대 규칙 8), reanimated 는 아직 미도입이다 (`mobile.md` 미확정).
 *
 * 닫는 방법 세 가지 (design.md §6.1 · §6.2 · §2.4)
 *
 * | 경로 | iOS | Android |
 * |---|---|---|
 * | 스크림 탭 | ○ | ○ |
 * | 아래로 스와이프 | ○ | ○ |
 * | 하드웨어 백 | 해당 없음 | ○ (`Modal.onRequestClose`) |
 *
 * `dismissible={false}` 면 세 경로를 <b>모두</b> 막는다 — 되돌릴 수 없는 처리가 진행 중일 때
 * 화면을 떠나면 결과를 알 수 없게 된다 (design.md §6.5).
 */
import React, {useEffect, useMemo, useRef, type PropsWithChildren} from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

/** 아래로 이만큼 끌면 닫는다. 짧은 흔들림으로 닫히지 않을 만큼은 되어야 한다. */
const CLOSE_DISTANCE = 80;
const SLIDE_MS = 200;

type Props = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  /** 처리 중에는 `false`. 스크림 탭·스와이프·하드웨어 백을 모두 막는다 (design.md §6.5) */
  dismissible?: boolean;
  /**
   * 안드로이드 하드웨어 백이 `onClose` 와 달라야 할 때만 준다 (design.md §2.4).
   * 예: 거절 사유 입력 단계에서 백은 <b>기본 단계로 되돌린다</b> — 200자를 쓰다가
   * 백 한 번에 사라지면 안 된다. 스크림 탭·스와이프는 그대로 `onClose` 다.
   */
  onHardwareBack?: () => void;
  /**
   * 입력란이 있는 단계에서 참으로 준다 (design.md §6.2 · §6.4).
   * `behavior` 는 iOS `padding` / Android `height` 로 갈린다 (M-20).
   */
  avoidKeyboard?: boolean;
  /** 스크린리더가 시트를 열었을 때 먼저 읽을 이름. 보통 시트 제목이다 (design.md §3.5) */
  accessibilityLabel: string;
  testID?: string;
}>;

export function BottomSheet({
  visible,
  onClose,
  dismissible = true,
  onHardwareBack,
  avoidKeyboard = false,
  accessibilityLabel,
  children,
  testID,
}: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(visible ? 24 : 0);
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: SLIDE_MS,
      useNativeDriver: true,
    }).start();
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: SLIDE_MS,
        useNativeDriver: true,
      }).start();
    }
  }, [opacity, translateY, visible]);

  /** 아래로 스와이프. 두 플랫폼 모두에서 같은 제스처로 닫힌다 (design.md §6.2). */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => dismissible && gesture.dy > 8,
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_event, gesture) => {
          if (dismissible && gesture.dy > CLOSE_DISTANCE) {
            onClose();
            return;
          }
          Animated.timing(translateY, {
            toValue: 0,
            duration: SLIDE_MS,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dismissible, onClose, translateY],
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      // 안드로이드 하드웨어 백. iOS 에서는 호출되지 않는다 (M-20 — 양쪽 경로를 함께 둔다)
      onRequestClose={() => {
        if (dismissible) {
          (onHardwareBack ?? onClose)();
        }
      }}
      testID={testID}>
      <KeyboardAvoidingView
        // iOS 는 `padding`, 안드로이드는 `height` — `default` 를 반드시 채운다 (M-20 / design.md §6.2)
        behavior={avoidKeyboard ? Platform.select({ios: 'padding', default: 'height'}) : undefined}
        className="flex-1 justify-end">
        {/* 스크림 rgba(0,0,0,0.4) — design.md §6.1 */}
        <Animated.View className="absolute inset-0 bg-black/40" style={{opacity}}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            className="flex-1"
            disabled={!dismissible}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          // iOS: 시트 밖 요소를 스크린리더 대상에서 뺀다. 배경 화면 쪽 처리는
          // {@link SHEET_BACKDROP_A11Y} 가 맡는다 (design.md §6.2 / M-20)
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={{
            // 하단 안전영역만큼 아래 패딩을 더한다 (design.md §6.1). 값이 런타임에 오므로
            // className 으로 표현할 수 없다 (M-15 예외).
            paddingBottom: insets.bottom + 32,
            transform: [{translateY}],
          }}
          // 상단 모서리만 라운드 20, 화면 폭 전체, 내부 패딩 20 (design.md §6.1)
          className="max-h-[80%] rounded-t-[20px] bg-surface px-5 pt-2"
          {...panResponder.panHandlers}>
          {/* 핸들 바 36×4 — 닫기(×) 버튼을 따로 두지 않는다 (design.md §6.1) */}
          <View className="items-center py-1">
            <View className="h-1 w-9 rounded-chip bg-border" />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * 시트가 열려 있는 동안 배경 화면을 스크린리더에서 빼는 prop 묶음 (design.md §6.2 / M-20).
 *
 * iOS 는 `accessibilityElementsHidden`, 안드로이드는 `importantForAccessibility` 를 본다 —
 * 한쪽만 주면 반대쪽에서 배경이 계속 읽힌다. 두 prop 은 서로의 플랫폼에서 무시되므로
 * 분기 없이 함께 펼친다.
 */
export const SHEET_BACKDROP_A11Y = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** 시트가 열려 있는 동안 iOS 의 화면 스와이프 백을 끈다 (design.md §6.2). */
export const sheetGestureEnabled = (sheetOpen: boolean) =>
  Platform.select({
    ios: !sheetOpen,
    // 안드로이드 네이티브 스택에는 화면 스와이프 백이 없다 — 값이 무시되지만 비워 두지 않는다 (M-20)
    default: true,
  });
