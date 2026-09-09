/**
 * `design.md` §9 가 확정한 사용자 문구. <b>개발자가 문구를 지어내지 않는다</b> (M-7).
 *
 * 여기 없는 문장이 필요하면 코드에 쓰지 말고 `defects.md` 로 ux-designer 에게 요청한다.
 *
 * <b>서버가 내리는 문구는 여기 없다</b> (design.md §9.7 / C-8 / M-18).
 * - 가입 사유가 없는 신청의 대체 문구 → `PendingUserItem.signup_reason_text`
 *   (그 문자열이 앱 코드에 나타나면 위반이다)
 * - 상태 배지 라벨("승인됨" 등) → `ProcessedUserItem.status_label`
 * - 처리 시각 접두어("승인" / "정지" / "거절") → `ProcessedUserItem.processed_at_prefix`
 * - 대기 건수 정수 → `pending_approval_count`
 */

/** §9.1 진입점 · 화면 제목 */
export const ENTRY = {
  /** 설정 화면의 섹션 헤더 (§4.2) */
  section: '관리자',
  /** 설정 행의 라벨 (§4.2) */
  row: '가입 신청 관리',
  /** 행 우측 값. 0건이면 값 자리를 비운다 (§4.4) */
  count: (pending: number) => `${pending}건`,
  /**
   * 낭독의 값 자리 (§4.6). `Layout/ListRow` 가 "라벨, 값" 으로 조합하므로
   * 최종 문장은 "가입 신청 관리, 검토 대기 3건" 이 된다.
   */
  countLabel: (pending: number) => `검토 대기 ${pending}건`,
  /** 0건일 때의 낭독 값. 시각적으로는 비움이 정보지만 낭독에서 침묵은 정보가 되지 못한다 (§4.6) */
  countLabelEmpty: '검토 대기 없음',
} as const;

/** §9.1 목록 화면 */
export const LIST = {
  title: '가입 신청 관리',
  /** 0이면 숫자를 붙이지 않는다 — "검토 대기 0" 은 읽기 어색하다 (§5.2) */
  segmentPending: (pending: number) => (pending > 0 ? `검토 대기 ${pending}` : '검토 대기'),
  /** "처리됨" 이 아니라 "처리 완료" 다. 두 표기를 섞지 않는다 (§5.2 / 2026-09-07 확정) */
  segmentProcessed: '처리 완료',
  back: '뒤로',
} as const;

/** §9.2 목록 */
export const LIST_MESSAGES = {
  /** 검토 대기 행의 시각 줄. 접두어가 화면 문구인 유일한 목록이다 (§5.3) */
  requestedAt: (dateTime: string) => `신청 ${dateTime}`,
  /**
   * 처리 완료 행의 시각 줄 (§5.4). <b>접두어는 서버 값</b>이고 시각만 앱이 포맷팅한다 —
   * 앱이 `status` 로 접두어를 고르면 C-8 / M-18 위반이다.
   */
  processedAt: (serverPrefix: string, dateTime: string) => `${serverPrefix} ${dateTime}`,
  empty: {
    pending: {
      title: '검토할 신청이 없어요',
      body: '새 신청이 들어오면 여기에 표시돼요.',
    },
    processed: {
      title: '아직 처리한 신청이 없어요',
      body: '승인하거나 거절한 신청이 여기에 표시돼요.',
    },
  },
  error: {
    server: {title: '명단을 불러오지 못했어요', body: '잠시 후 다시 시도해 주세요.'},
    network: {title: '연결을 확인해 주세요', body: '네트워크에 연결되면 다시 불러올게요.'},
    forbidden: {
      title: '관리자만 볼 수 있어요',
      body: '이 화면을 볼 수 있는 권한이 없어요.',
      action: '설정으로 돌아가기',
    },
  },
  refreshFailed: {title: '새로 고치지 못했어요', body: '잠시 후 다시 시도해 주세요.'},
  more: {
    loading: '불러오는 중',
    end: '모두 확인했어요',
    failed: '더 불러오지 못했어요',
  },
} as const;

/** §9.2 공통 */
export const COMMON = {
  retry: '다시 시도',
  retrying: '불러오는 중…',
  close: '닫기',
} as const;

/** §9.3 신청 상세 시트 */
export const REQUEST_SHEET = {
  title: '가입 신청',
  fieldEmail: '이메일',
  fieldReason: '가입 사유',
  fieldRequestedAt: '신청 시각',
  approve: '승인',
  approving: '승인 중…',
  reject: '거절',
  confirmTitle: '이 신청을 거절할까요?',
  confirmBody: '거절하면 이 사용자는 로그인할 수 없어요. 나중에 거절을 취소할 수 있어요.',
  reasonLabel: '거절 사유',
  reasonPlaceholder: '왜 거절하는지 남겨두면 나중에 확인할 때 도움이 돼요.',
  reasonHelp: '관리자만 볼 수 있어요. 200자까지 쓸 수 있어요.',
  rejectConfirm: '거절하기',
  rejecting: '거절하는 중…',
  back: '뒤로',
  toastApproved: '승인했어요',
  toastRejected: '거절했어요',
} as const;

/** 거절 사유 최대 길이 (AC-16). 201번째 글자 입력을 `maxLength` 로 막는다 (§6.4) */
export const REJECTION_REASON_MAX = 200;

/** §9.4 사용자 상세 시트 */
export const USER_SHEET = {
  title: '사용자',
  fieldEmail: '이메일',
  fieldStatus: '상태',
  fieldApprovedAt: '승인 시각',
  fieldSuspendedAt: '정지 시각',
  fieldRejectedAt: '거절 시각',
  suspend: '이용 정지',
  suspendConfirmTitle: '이용을 정지할까요?',
  suspendConfirmBody: '정지하면 이 사용자는 로그인할 수 없어요. 나중에 정지를 해제할 수 있어요.',
  suspending: '정지하는 중…',
  toastSuspended: '이용을 정지했어요',
  unsuspend: '정지 해제',
  unsuspending: '해제하는 중…',
  toastUnsuspended: '정지를 해제했어요',
  cancelReject: '거절 취소',
  cancelRejectConfirmTitle: '거절을 취소할까요?',
  cancelRejectConfirmBody: '이 신청이 다시 검토 대기 목록으로 돌아가요.',
  cancelingReject: '되돌리는 중…',
  toastRejectCanceled: '검토 대기로 되돌렸어요',
  selfNotice: '내 계정이에요. 스스로 정지할 수 없어요.',
  selfErrorTitle: '내 계정은 정지할 수 없어요',
  selfErrorBody: '스스로를 정지할 수는 없어요.',
  /** 확인 다이얼로그의 취소 버튼 (§7.3 · §7.5) */
  cancel: '취소',
} as const;

/** §9.5 처리 오류 · 경합 */
export const ACTION_ERROR = {
  network: {
    title: '연결을 확인해 주세요',
    body: '아직 처리되지 않았어요. 연결 후 다시 시도해 주세요.',
  },
  server: {title: '잠시 후 다시 시도해 주세요', body: '아직 처리되지 않았어요.'},
  conflict: {
    title: '이미 처리된 신청이에요',
    body: '다른 기기에서 먼저 처리됐어요. 목록을 새로 고쳤어요.',
  },
} as const;

/** §9.6 스크린리더 전용 문장 */
export const A11Y = {
  rowHint: '두 번 눌러 상세를 엽니다',
  refreshed: '목록을 새로 고쳤어요',
  /** N 은 응답 `items` 배열의 길이다. 전용 필드가 없다 (status.md D-4) */
  moreLoaded: (loaded: number) => `${loaded}건을 더 불러왔어요`,
  /**
   * 목록 행의 낭독 문장 (§3.5). 이메일 → 상태 → 시각 → 가입 사유 순으로 잇는다.
   * 상태 라벨과 시각 접두어는 <b>서버 값</b>이므로 인자로 받는다.
   */
  row: (parts: (string | undefined)[]) => parts.filter(Boolean).join(', '),
} as const;

/**
 * 빈 상태·오류 블록의 아이콘 글리프 (§5.8 · §5.9 · §5.10).
 *
 * 아이콘 라이브러리를 새로 들이지 않고 글리프로 표현한다 — 새 의존성은 배포 심사에 영향을 주는
 * 결정이라 사람에게 물어야 한다 (M-19 / 절대 규칙 8). `Feedback/StatusIcon` 과 같은 방식이다.
 * design.md 가 지정한 이름(`inbox` · `alert-circle` · `wifi-off` · `lock`)에 대응한다.
 */
export const GLYPH = {
  inbox: '▤',
  alertCircle: '⚠',
  wifiOff: '⇎',
  lock: '⊘',
} as const;
