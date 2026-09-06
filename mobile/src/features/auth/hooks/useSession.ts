/**
 * 세션의 <b>클라이언트 상태</b>만 담는다 (M-4).
 *
 * 여기 없는 것과 그 이유:
 * <ul>
 *   <li>사용자 정보 — 서버 데이터라 react-query 가 소유한다. 설정 화면이 `GET /auth/me` 로 읽는다.</li>
 *   <li>계정 상태 안내 데이터 — 로그인 응답으로 한 번 오고 그 화면에서만 쓰는 값이라
 *       내비게이션 파라미터로 넘긴다. 전역에 복사하면 화면을 떠난 뒤에도 남아
 *       "언제 지워야 하는가" 라는 문제가 새로 생긴다.</li>
 *   <li>토큰 — Keychain 에만 둔다 (AC-18 / M-14).</li>
 * </ul>
 */
import {create} from 'zustand';

import type {SessionNotice} from '../types';

type SessionState = {
  isSignedIn: boolean;
  /** 로그인 화면 상단에 띄울 배너 사유 (design.md §4.3). 한 번 표시하면 지운다 */
  notice: SessionNotice;
  /** 로그인 화면에 도착해 띄울 토스트 (로그아웃 완료 / 계정 삭제 완료) */
  toast: string | null;

  signIn: () => void;
  /** 세션이 끝났다. 사유가 있으면 로그인 화면이 배너로 알린다 */
  signOut: (notice?: SessionNotice, toast?: string) => void;
  consumeNotice: () => void;
  consumeToast: () => void;
};

export const useSession = create<SessionState>(set => ({
  isSignedIn: false,
  notice: null,
  toast: null,

  signIn: () => set({isSignedIn: true, notice: null}),
  signOut: (notice = null, toast) =>
    set({isSignedIn: false, notice, toast: toast ?? null}),
  consumeNotice: () => set({notice: null}),
  consumeToast: () => set({toast: null}),
}));
