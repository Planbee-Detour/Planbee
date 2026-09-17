/**
 * 테스트용 react-query 클라이언트.
 *
 * 기본 `gcTime` 은 300초다. 마지막 쿼리·뮤테이션이 그 길이의 gc 타이머를 걸어 두면
 * 테스트가 끝나도 이벤트 루프가 살아 있어, jest 가
 * `Jest did not exit one second after the test run has completed` 를 찍고
 * **5분을 더 기다린 뒤에야** 종료한다 (CI 에서 런마다 5분씩 낭비).
 *
 * 테스트는 매번 클라이언트를 새로 만들어 쓰므로 캐시를 붙들 이유가 없다 — `gcTime: 0` 으로 둔다.
 * 앱의 실제 설정은 `src/app/providers.tsx` 에 있다. 그쪽은 `staleTime`·재시도 정책이
 * 달린 프로덕션 설정이므로 여기 값을 옮기지 않는다.
 */
import {QueryClient} from '@tanstack/react-query';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {retry: false, gcTime: 0},
      mutations: {gcTime: 0},
    },
  });
}
