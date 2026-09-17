/**
 * 시각 표기 (design.md §3.3).
 *
 * 서버는 ISO 8601 UTC 로 내리고(C-2) 앱은 <b>표시 직전에 기기 로컬로 바꿔 포맷팅만</b> 한다.
 * 이것은 C-8 이 허용하는 "순수 표현 포맷팅" 이다 — 파생값 계산이 아니다.
 *
 * <b>상대 시각("3분 전")을 쓰지 않는다</b> (design.md §1.2 f / M-18). 그 값은 현재 시각과
 * 응답 값으로 앱이 계산하는 값이다.
 */

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * 목록·시트 공통 형식 `YYYY. M. D. HH:mm` (24시간). 예: `2026. 9. 5. 14:20`
 *
 * `auth` 는 날짜만 필요해 `YYYY. M. D.` 를 썼다. 여기는 최신순 목록이라 같은 날 여러 건이
 * 들어오고, 분 단위가 없으면 순서를 눈으로 확인할 수 없다.
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    // 계약이 보장하는 형식이 아니면 원본을 그대로 보여준다. 화면이 깨지지 않는 편이 낫다.
    return isoString;
  }
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * 낭독용 형식 `2026년 9월 5일 14시 20분` (design.md §3.5).
 *
 * 화면 표기(`2026. 9. 5. 14:20`)를 그대로 넘기면 스크린리더가 마침표를 문장 끝으로 읽어 끊긴다.
 */
export function formatSpokenDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes()}분`;
}
