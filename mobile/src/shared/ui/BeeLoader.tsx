/**
 * AI 로딩 캐릭터 — 지도를 든 벌 (`docs/design/bee-loader.md` · pen `AI/BeeLoader`).
 *
 * AI 결과(추천 조회 등)를 기다리는 동안 보여준다. 캐릭터와 움직임만 책임지고, 안내 문구·배경·
 * 오류 전환은 쓰는 화면이 정한다 (명세 §1 · §9).
 *
 * - `float`(기본): 둥실 1600ms 왕복 + 날갯짓 240ms 왕복
 * - `orbit`: 가로로 긴 타원 궤도 3600ms (캐릭터 size×0.5, 반지름 가로 size×0.25 · 세로 size×0.10),
 *   한 바퀴에 3번 위아래로 크게 꼬불거린다 + 날갯짓
 * - "동작 줄이기" 가 켜져 있으면 두 모션 모두 멈추고 가운데에 원래 크기로 선다 (§5.4)
 *
 * 애니메이션은 전부 `View` 의 transform 이라 네이티브 드라이버로 돈다 — SVG 속성을 애니메이션하면
 * JS 스레드에서 돌아, 로딩 중 JS 가 바쁠 때 캐릭터가 멈춘다. 날개만 따로 돌리기 위해 캐릭터를
 * 레이어 다섯 장으로 겹친다 (`beeArtwork.ts` 참조).
 */
import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import Svg, {G, Path} from 'react-native-svg';

import {useReduceMotion} from '../lib/useReduceMotion';
import {BEE_LAYER_ORDER, BEE_LAYERS, BEE_VIEWBOX, BEE_WING_PIVOT, type BeeColor, type BeePath} from './beeArtwork';
import {COLOR} from './tokens';

export type BeeLoaderVariant = 'float' | 'orbit';

export type BeeLoaderProps = {
  variant?: BeeLoaderVariant;
  /** 정사각형 상자 한 변(pt). 캐릭터와 이동 거리가 비례한다 */
  size?: number;
  /** 스크린리더가 읽는 이름. 화면이 맥락에 맞게 바꾼다 (예: "추천을 찾고 있어요") */
  accessibilityLabel?: string;
  testID?: string;
};

/** 명세 §5 의 수치. 이동 거리는 96pt 기준값이다 */
const BASE_SIZE = 96;
const FLAP_MS = 240;
/** 날개 각도. RN 의 rotate 는 시계 방향이 양수 — 위로 14° = '14deg', 아래로 10° = '-10deg' (§5.1) */
const WING_UP_DEG = 14;
const WING_DOWN_DEG = -10;
const FLOAT_MS = 1600;
const FLOAT_RISE = 6;
const ORBIT_MS = 3600;
const ORBIT_SCALE = 0.5;
/** 가로 반지름은 캐릭터가 상자 밖으로 나가지 않는 최대치다 — 캐릭터 절반 0.25 + 0.25 = 0.5 (§5.3) */
const ORBIT_RADIUS_X = 0.25;
const ORBIT_RADIUS_Y = 0.1;
const ORBIT_TILT_DEG = 8;
/** 꼬불거림 — 한 바퀴에 흔들리는 횟수, 폭(size 비율), 흔들림에 맞춰 더 기울이는 각도 (§5.3) */
const ORBIT_WIGGLES = 3;
const ORBIT_WIGGLE = 0.09;
const ORBIT_WIGGLE_TILT_DEG = 6;
/** 궤도를 보간할 표본 수. interpolate 는 구간마다 직선이라, 꼬불거림 한 번에 표본 30개를 준다 */
const ORBIT_SAMPLES = ORBIT_WIGGLES * 30;

const FILL: Record<BeeColor, string> = {
  bee: COLOR.illustrationBee,
  stripe: COLOR.illustrationStripe,
  cream: COLOR.illustrationCream,
  outline: COLOR.illustrationOutline,
  surface: COLOR.surface,
};

const ease = Easing.inOut(Easing.ease);

export function BeeLoader({variant = 'float', size = BASE_SIZE, accessibilityLabel = '불러오는 중', testID}: BeeLoaderProps) {
  const reduceMotion = useReduceMotion();
  const flap = useRef(new Animated.Value(0)).current;
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    flap.setValue(0);
    travel.setValue(0);
    if (reduceMotion) {
      return;
    }
    const flapLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flap, {toValue: 1, duration: FLAP_MS / 2, easing: ease, useNativeDriver: true}),
        Animated.timing(flap, {toValue: 0, duration: FLAP_MS / 2, easing: ease, useNativeDriver: true}),
      ]),
    );
    const travelLoop =
      variant === 'orbit'
        ? Animated.loop(
            Animated.timing(travel, {toValue: 1, duration: ORBIT_MS, easing: Easing.linear, useNativeDriver: true}),
          )
        : Animated.loop(
            Animated.sequence([
              Animated.timing(travel, {toValue: 1, duration: FLOAT_MS / 2, easing: ease, useNativeDriver: true}),
              Animated.timing(travel, {toValue: 0, duration: FLOAT_MS / 2, easing: ease, useNativeDriver: true}),
            ]),
          );
    flapLoop.start();
    travelLoop.start();
    return () => {
      flapLoop.stop();
      travelLoop.stop();
    };
  }, [flap, travel, reduceMotion, variant]);

  const motion = useMemo(() => {
    const samples = Array.from({length: ORBIT_SAMPLES + 1}, (_unused, index) => index / ORBIT_SAMPLES);
    const radiusX = size * ORBIT_RADIUS_X;
    const radiusY = size * ORBIT_RADIUS_Y;
    const wiggle = size * ORBIT_WIGGLE;
    const lap = (t: number) => 2 * Math.PI * t;
    const wave = (t: number) => 2 * Math.PI * ORBIT_WIGGLES * t;
    return {
      wing: flap.interpolate({inputRange: [0, 1], outputRange: [`${WING_DOWN_DEG}deg`, `${WING_UP_DEG}deg`]}),
      floatY: travel.interpolate({inputRange: [0, 1], outputRange: [0, (-FLOAT_RISE * size) / BASE_SIZE]}),
      orbitX: travel.interpolate({inputRange: samples, outputRange: samples.map(t => radiusX * Math.sin(lap(t)))}),
      orbitY: travel.interpolate({
        inputRange: samples,
        outputRange: samples.map(t => -radiusY * Math.cos(lap(t)) + wiggle * Math.sin(wave(t))),
      }),
      orbitTilt: travel.interpolate({
        inputRange: samples,
        outputRange: samples.map(
          t => `${ORBIT_TILT_DEG * Math.sin(lap(t)) + ORBIT_WIGGLE_TILT_DEG * Math.cos(wave(t))}deg`,
        ),
      }),
    };
  }, [flap, travel, size]);

  const wingRotate = reduceMotion ? undefined : motion.wing;
  const orbiting = variant === 'orbit' && !reduceMotion;
  const orbitSize = size * ORBIT_SCALE;
  const orbitOffset = (size - orbitSize) / 2;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      style={{width: size, height: size}}
      testID={testID}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {orbiting ? (
          <Animated.View
            style={[
              styles.layer,
              {
                left: orbitOffset,
                top: orbitOffset,
                transform: [{translateX: motion.orbitX}, {translateY: motion.orbitY}, {rotate: motion.orbitTilt}],
              },
            ]}>
            <BeeCharacter size={orbitSize} wingRotate={wingRotate} />
          </Animated.View>
        ) : (
          <Animated.View style={{transform: reduceMotion ? [] : [{translateY: motion.floatY}]}}>
            <BeeCharacter size={size} wingRotate={wingRotate} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function BeeCharacter({size, wingRotate}: {size: number; wingRotate?: Animated.AnimatedInterpolation<string>}) {
  const wingStyle = [
    styles.layer,
    {
      width: size,
      height: size,
      transformOrigin: [BEE_WING_PIVOT.x * size, BEE_WING_PIVOT.y * size, 0],
      transform: wingRotate ? [{rotate: wingRotate}] : [],
    },
  ];

  return (
    <View style={{width: size, height: size}}>
      {BEE_LAYER_ORDER.map(layer =>
        layer === 'wingFill' || layer === 'wingLine' ? (
          <Animated.View key={layer} style={wingStyle}>
            <BeeLayerSvg paths={BEE_LAYERS[layer]} size={size} />
          </Animated.View>
        ) : (
          <BeeLayerSvg key={layer} paths={BEE_LAYERS[layer]} size={size} />
        ),
      )}
    </View>
  );
}

function BeeLayerSvg({paths, size}: {paths: readonly BeePath[]; size: number}) {
  return (
    <Svg height={size} style={styles.layer} viewBox={BEE_VIEWBOX} width={size}>
      {paths.map(path => (
        <G key={path.name} transform={`translate(${path.x} ${path.y})`}>
          <Path
            d={path.d}
            fill={path.fill ? FILL[path.fill] : 'none'}
            stroke={path.strokeWidth ? FILL.outline : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={path.strokeWidth}
          />
        </G>
      ))}
    </Svg>
  );
}

/** 레이어를 같은 자리에 겹친다 — 크기와 위치 보정은 각 호출부가 덧붙인다 */
const styles = StyleSheet.create({
  layer: {position: 'absolute', left: 0, top: 0},
});
