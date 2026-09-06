/**
 * `design.md` §11 이 확정한 사용자 문구. <b>개발자가 문구를 지어내지 않는다</b> (M-7).
 *
 * 여기 없는 문장이 필요하면 코드에 쓰지 말고 `defects.md` 로 ux-designer 에게 요청한다.
 *
 * <b>서버가 내리는 문구는 여기 없다.</b> 계정 상태 안내 화면의 제목·본문·강조 카드는
 * 응답의 `account_status` 에 담겨 오고 앱은 렌더만 한다 (C-8 / AC-46).
 * 문의 <b>주소</b>도 문구가 아니라 응답 값이다 (AC-42).
 */

/** §11.1 필드 오류 */
export const FIELD_ERRORS = {
  emailRequired: '이메일을 입력해 주세요',
  emailFormat: '이메일 형식이 올바르지 않아요',
  emailDuplicated: '이미 가입 신청된 이메일입니다',
  passwordRequired: '비밀번호를 입력해 주세요',
  passwordPolicy: '영문과 숫자를 포함해 8자 이상',
  passwordMismatch: '비밀번호를 확인해 주세요',
} as const;

/** §11.2 배너·화면 메시지 */
export const MESSAGES = {
  login: {
    credentials: '이메일 또는 비밀번호를 확인해 주세요',
    lockedTitle: '로그인을 잠시 제한했어요',
    lockedDetail:
      '비밀번호를 여러 번 잘못 입력해서 잠시 동안 로그인을 막아 뒀어요. 남은 시간이 지나면 다시 시도할 수 있어요.',
    /** N 은 서버가 내려준 정수. 앱이 카운트다운을 계산하지 않는다 (M-18) */
    lockedRemaining: (minutes: number) => `남은 시간 약 ${minutes}분`,
    lockedHelp:
      '비밀번호가 기억나지 않으면 지금은 앱에서 직접 바꿀 수 없어요. 아래로 알려주시면 확인 후 도와드릴게요.',
  },
  session: {
    expiredTitle: '다시 로그인해 주세요',
    expiredDetail: '오랫동안 앱을 열지 않아 자동으로 로그아웃됐어요.',
    revokedTitle: '보안을 위해 모든 기기에서 로그아웃했어요. 다시 로그인해 주세요.',
  },
  error: {
    server: '잠시 후 다시 시도해 주세요',
    network: '연결을 확인해 주세요',
  },
  signup: {
    networkDetail: '입력한 내용은 그대로 있어요. 연결 후 다시 신청해 주세요.',
  },
  splash: {
    networkDetail: '네트워크에 연결되면 이어서 진행할게요.',
  },
  delete: {
    networkDetail: '계정은 삭제되지 않았어요. 연결 후 다시 시도해 주세요.',
    serverDetail: '계정은 삭제되지 않았어요.',
  },
  legal: {
    assetErrorTitle: '문서를 여는 데 문제가 생겼어요',
    assetErrorDetail: '앱을 다시 시작하거나 최신 버전으로 업데이트해 주세요.',
  },
  status: {
    unknownTitle: '계정 상태를 확인해 주세요',
    unknownDetail: '지금은 로그인할 수 없어요. 잠시 후 다시 시도해 주세요.',
  },
} as const;

/** §11.2.1 문의 블록 — 네 화면 공용 */
export const CONTACT = {
  action: '문의하기',
  /**
   * 주소를 받지 못한 네 화면에서 <b>글자 하나 다르지 않게</b> 같아야 한다 (AC-43·AC-44).
   * 같은 원인이므로 같은 문장이어야 사용자가 재확인하지 않는다.
   */
  unavailable: '문의 창구를 준비하고 있어요. 조금 뒤에 다시 확인해 주세요.',
  pendingLead: '승인이 너무 오래 걸리거나 궁금한 점이 있으면 문의해 주세요.',
  mailUnavailableTitle: '메일 앱을 열 수 없어요',
  mailUnavailableBody: '아래 주소로 직접 보내주세요.',
  copy: '주소 복사',
  confirm: '확인',
} as const;

/** §11.2.1 메일 제목 — 화면마다 다르다 */
export const CONTACT_SUBJECTS = {
  loginLocked: '[Planbee] 로그인 문의',
  pending: '[Planbee] 가입 신청 문의',
  rejected: '[Planbee] 가입 문의',
  suspended: '[Planbee] 이용 정지 문의',
} as const;

/** §11.4 버튼·라벨 */
export const LABELS = {
  login: '로그인',
  loginBusy: '로그인 중…',
  goSignUp: '가입 신청하기',
  retry: '다시 시도',
  or: '또는',
  tagline: '계획이 바뀌어도 괜찮아요.',
  splashTagline2: 'Planbee가 다음 계획을 찾아드릴게요.',
  loginNotice:
    'Planbee는 승인제로 운영돼요.\n가입을 신청하면 관리자가 확인한 뒤 알려드려요.',
  goLoginScreen: '로그인 화면으로',
  loading: '불러오는 중',

  /** NavBar 타이틀 (§5.2) — 본문 H1 과 다른 문장이다 */
  signUpNavTitle: '가입 신청',
  /** 본문 첫 줄 H1 (§5.2) */
  signUpTitle: 'Planbee 가입 신청',
  signUpLead: '관리자가 신청 내용을 확인한 뒤 이용할 수 있어요.',
  signUpSubmit: '가입 신청하기',
  signUpBusy: '신청 중…',
  alreadyMember: '이미 계정이 있나요?',

  emailLabel: '이메일',
  emailPlaceholder: 'name@example.com',
  emailHelp: '로그인할 때 쓰는 주소예요.',
  passwordLabel: '비밀번호',
  passwordPlaceholder: '비밀번호',
  reasonLabel: '가입 사유',
  reasonPlaceholder: '어떤 상황에서 Planbee를 쓰고 싶은지 알려주세요.',
  reasonHelp: '승인 심사에 참고해요. 100자까지 쓸 수 있어요.',

  consentAll: '전체 동의',
  consentAllDetail: '선택 항목을 포함해 모두 동의합니다.',
  consentTerms: '이용약관에 동의합니다',
  consentPrivacy: '개인정보 수집·이용에 동의합니다',
  consentAge: '만 14세 이상입니다',
  consentAgeDetail: '만 14세 미만은 가입할 수 없어요.',
  consentMarketing: '마케팅·알림 수신에 동의합니다',
  consentMarketingDetail: '동의하지 않아도 서비스를 이용할 수 있어요.',
  consentView: '보기',
  consentFooter: '필수 항목에 동의해야 가입을 신청할 수 있어요.',

  leaveTitle: '작성 중인 내용을 지울까요?',
  leaveBody: '지금 나가면 입력한 내용이 사라져요.',
  leaveConfirm: '나가기',
  leaveCancel: '계속 작성',

  legalEffectiveDate: (date: string) => `시행일 ${date}`,
  legalEffectiveDatePending: '시행일 준비 중',
  legalSummaryTitle: '꼭 확인해 주세요',
  legalSummaryFooter: '자세한 내용은 아래 전문을 확인해 주세요.',
  legalOfflineNote: '이 문서는 앱에 함께 담겨 있어 인터넷 연결 없이도 볼 수 있어요.',
  legalAgreeAndClose: '동의하고 닫기',
  close: '닫기',

  statusAppliedEmail: '신청한 이메일',
  statusAppliedAt: '신청일',
  viewTerms: '이용약관 보기',
  viewPrivacy: '개인정보 처리방침 보기',
  deleteAccount: '계정 삭제',

  settings: '설정',
  sectionAccount: '계정',
  sectionLegal: '약관·정책',
  sectionApp: '앱 정보',
  appVersion: '버전',
  logout: '로그아웃',
  deleteAccountNote: '계정을 삭제하면 되돌릴 수 없어요.',
  loadFailed: '불러오지 못했어요',

  logoutConfirmTitle: '로그아웃할까요?',
  logoutConfirmBody: '다시 이용하려면 로그인해야 해요.',
  logoutDone: '로그아웃했어요',
  cancel: '취소',

  /** AC-30 이 지정한 문구. <b>토씨 그대로</b> 쓴다 — 경어체가 아닌 점 포함 (§11.5) */
  deleteWarningTitle: '삭제하면 되돌릴 수 없습니다',
  deleteWarningLead: '계정을 삭제하면 아래 정보가 즉시 지워져요.',
  deleteWarningItems: [
    '이메일 주소',
    '비밀번호',
    '가입 사유',
    '약관 동의 이력',
    'Planbee 이용 기록',
  ],
  deleteWarningTail: '지운 정보는 복구할 수 없어요.',
  deleteRejoinNote:
    '같은 이메일로 다시 가입을 신청할 수는 있어요.\n다만 이전 기록은 되돌아오지 않아요.',
  deletePasswordPrompt: '계속하려면 비밀번호를 입력해 주세요',
  deletePasswordPlaceholder: '현재 비밀번호',
  deletePasswordHelp: '본인 확인을 위해 한 번 더 입력해 주세요.',
  deleteBusy: '삭제 중…',
  deleteConfirmTitle: '정말 삭제할까요?',
  deleteConfirm: '삭제',
  deleteDone: '계정이 삭제되었어요',

  a11yDeleteHint: '계정을 삭제하는 화면으로 이동합니다. 삭제하면 되돌릴 수 없습니다.',
  a11yDeleteButton: '계정 삭제, 되돌릴 수 없습니다',
  /** §3.5 — 스플래시 진입 시 한 번 읽는 문장. `shared/lib/a11y` 가 양쪽 플랫폼에서 읽는다 */
  a11ySplashAnnounce: 'Planbee 를 준비하고 있어요',
} as const;

/** §5.5 제출 버튼 비활성 사유 — 위에서부터 첫 번째 미충족 항목 하나만 읽는다 */
export const SUBMIT_HINTS = {
  email: '이메일 형식을 확인해 주세요',
  password: '비밀번호 조건을 확인해 주세요',
  consent: '필수 동의 항목을 모두 선택해 주세요',
} as const;
