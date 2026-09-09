/**
 * `className` 을 받지 못하는 RN prop 에 넘길 토큰 **값**. (mobile.md M-16)
 *
 * `color`(ActivityIndicator) · `placeholderTextColor`(TextInput) · `backgroundColor`(StatusBar) 는
 * 스타일 시스템을 타지 않고 색 값을 직접 받는다. 그렇다고 화면에 `#RRGGBB` 를 적으면
 * `tailwind.config.js` 의 토큰이 바뀔 때 이쪽만 조용히 어긋난다 — 그래서 <b>같은 파일에서 읽어 온다</b>.
 *
 * 값의 원본은 `tailwind.tokens.js` 이고 그 원본은 다시 `docs/design/planbee.pen` 의
 * `Screen 01 — Design System` 이다 (common.md C-9).
 *
 * 여기 없는 색이 필요하면 이 파일에 리터럴을 적지 말고 토큰을 먼저 확인한다.
 */
import {colors} from '../../../tailwind.tokens';

export const COLOR = {
  /** Color/Text/Primary — `text-ink` 와 같은 값 */
  ink: colors.ink.DEFAULT,
  /** Color/Text/Secondary — `text-ink-muted` 와 같은 값 */
  inkMuted: colors.ink.muted,
  /** Color/Text/OnDark — `text-on-dark` 와 같은 값 */
  onDark: colors['on-dark'],
  /** Color/Neutral/Background — `bg-background` 와 같은 값 */
  background: colors.background,
  /** Color/Brand/Honey — `bg-brand` 와 같은 값. 안드로이드 `RefreshControl colors` 용 */
  brand: colors.brand.DEFAULT,
  /** Color/Neutral/Surface — `bg-surface` 와 같은 값. 안드로이드 `progressBackgroundColor` 용 */
  surface: colors.surface,
} as const;
