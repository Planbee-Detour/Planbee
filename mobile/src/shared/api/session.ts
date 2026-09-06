/**
 * 인증 토큰 저장소. 토큰은 Keychain 에만 둔다 — MMKV/AsyncStorage 금지. (mobile.md M-14)
 *
 * <b>API 경계 모델과 저장 모델의 변환도 여기 있다</b> (M-17). 서버는 `access_token` /
 * `refresh_token` 으로 주고 Keychain 은 `Tokens { accessToken, refreshToken }` 으로 저장한다 —
 * 서로 다른 두 계약이라 배선이 필요하다. 그 배선은 `toTokens` 하나뿐이고, 화면·기능·`app/`
 * 어디서도 같은 변환을 다시 하지 않는다. 새 저장 항목이 생기면 여기에 함께 둔다.
 */
import * as Keychain from 'react-native-keychain';

import type {components} from './schema';

const SERVICE = 'com.planbee.auth';
const ACCOUNT = 'planbee';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

/** 계약이 정의한 토큰 쌍. 손으로 다시 적지 않고 생성물에서 가져온다 (M-8) */
type TokenPairPayload = components['schemas']['TokenPair'];

/** 경계(`snake_case`) → 저장 모델(`camelCase`). <b>이 변환은 여기 한 곳에만 있다</b> (M-17) */
export function toTokens(pair: TokenPairPayload): Tokens {
  return {accessToken: pair.access_token, refreshToken: pair.refresh_token};
}

/** 서버가 준 토큰 쌍을 그대로 넘겨 저장한다. 호출자가 필드를 풀어 쓰지 않는다 (M-17) */
export async function saveTokenPair(pair: TokenPairPayload): Promise<void> {
  await saveTokens(toTokens(pair));
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  await Keychain.setGenericPassword(ACCOUNT, JSON.stringify(tokens), {service: SERVICE});
}

export async function loadTokens(): Promise<Tokens | null> {
  const stored = await Keychain.getGenericPassword({service: SERVICE});
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored.password) as Partial<Tokens>;
    if (typeof parsed.accessToken !== 'string' || typeof parsed.refreshToken !== 'string') {
      return null;
    }
    return {accessToken: parsed.accessToken, refreshToken: parsed.refreshToken};
  } catch {
    // 저장 형식이 깨졌다면 로그인부터 다시 하는 편이 안전하다.
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE});
}
