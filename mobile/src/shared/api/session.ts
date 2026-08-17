/**
 * 인증 토큰 저장소. 토큰은 Keychain 에만 둔다 — MMKV/AsyncStorage 금지. (mobile.md M-14)
 */
import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.planbee.auth';
const ACCOUNT = 'planbee';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

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
