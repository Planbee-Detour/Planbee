/**
 * Keychain 은 네이티브 모듈이라 테스트에서 직접 쓸 수 없다. 메모리로 대체한다.
 * 저장/조회/삭제 동작만 흉내내며, 실제 보안 특성은 재현하지 않는다.
 */
type Entry = {username: string; password: string};

const store = new Map<string, Entry>();

export async function setGenericPassword(
  username: string,
  password: string,
  options?: {service?: string},
): Promise<boolean> {
  store.set(options?.service ?? 'default', {username, password});
  return true;
}

export async function getGenericPassword(options?: {service?: string}): Promise<Entry | false> {
  return store.get(options?.service ?? 'default') ?? false;
}

export async function resetGenericPassword(options?: {service?: string}): Promise<boolean> {
  return store.delete(options?.service ?? 'default');
}

/** 테스트에서 상태를 초기화할 때 사용한다. */
export function __resetKeychain(): void {
  store.clear();
}
