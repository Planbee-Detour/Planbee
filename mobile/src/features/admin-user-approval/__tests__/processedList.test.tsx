/**
 * `처리 완료` 세그먼트의 인수조건 검증 (PRD AC-19 도달 경로 · AC-20 / design.md §5.4).
 *
 * 세그먼트 2개 중 두 번째다. 라벨은 <b>"처리 완료"</b> 이고 "처리됨" 이 아니다 (2026-09-07 확정).
 * `APPROVED` · `SUSPENDED` · `REJECTED` 세 상태가 <b>한 목록에 섞인다</b> (Q1 / §1.2 b).
 *
 * 이 세그먼트도 로딩 · 정상 · 비어있음 · 오류 네 상태를 따로 갖는다 (§3.6 / M-6).
 */

// 시각은 앱이 기기 로컬로 바꿔 그린다 (§3.3). 시간대를 고정해 결과가 흔들리지 않게 한다.
// jest 는 Node 위에서 돌지만 이 프로젝트는 `@types/node` 를 두지 않는다 — RN 타입만 쓴다.
// 시간대만 바꾸면 되므로 필요한 만큼만 선언한다.
declare const process: {env: Record<string, string | undefined>};
process.env.TZ = 'Asia/Seoul';

import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {UserApprovalListScreen} from '../screens/UserApprovalListScreen';

const PENDING = `${API_ORIGIN}/api/v1/admin/users/pending`;
const PROCESSED = `${API_ORIGIN}/api/v1/admin/users/processed`;

/** `ProcessedUserItem` — contract.yaml 의 example 형태 그대로. */
function processedItem(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 7,
    email: 'hana@example.com',
    status: 'APPROVED',
    // 라벨과 접두어는 서버가 내리는 문자열이다 (C-8 / §3.4 · §5.4).
    status_label: '승인됨',
    processed_at: '2026-09-01T00:12:00Z',
    processed_at_prefix: '승인',
    approved_at: '2026-09-01T00:12:00Z',
    suspended_at: null,
    rejected_at: null,
    is_me: false,
    ...overrides,
  };
}

const processedPage = (items: unknown[], extra: Record<string, unknown> = {}) => ({
  items,
  has_next: false,
  next_cursor: null,
  pending_approval_count: 3,
  ...extra,
});

const emptyPending = () =>
  HttpResponse.json({items: [], has_next: false, next_cursor: null, pending_approval_count: 3});

const Stack = createNativeStackNavigator<{UserApprovalList: undefined}>();

/** 화면에 들어와 `처리 완료` 세그먼트로 전환한 상태를 만든다 (§5.2 — 기본은 `검토 대기`). */
async function renderProcessed() {
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const result = await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="UserApprovalList" component={UserApprovalListScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
  await fireEvent.press(screen.getByRole('tab', {name: '처리 완료'}));
  return result;
}

const rowLabels = () =>
  screen.getAllByHintText('두 번 눌러 상세를 엽니다').map(row => String(row.props.accessibilityLabel));

beforeEach(() => {
  server.use(http.get(PENDING, emptyPending));
});

describe('정상 — AC-20 · AC-19 도달 경로 (design.md §5.4)', () => {
  test('AC20_이메일과_처리_시각이_서버가_준_순서대로_보인다', async () => {
    server.use(
      http.get(PROCESSED, () =>
        HttpResponse.json(
          processedPage([
            processedItem({user_id: 9, email: 'newest@example.com', processed_at: '2026-09-06T09:03:00Z'}),
            processedItem({user_id: 7, email: 'older@example.com', processed_at: '2026-09-01T00:12:00Z'}),
          ]),
        ),
      ),
    );

    await renderProcessed();

    expect(await screen.findByText('newest@example.com', {}, {timeout: 3000})).toBeTruthy();
    // 정렬(마지막 처리 시각 내림차순)은 계약이 못 박았다. 앱은 받은 순서를 바꾸지 않는다.
    expect(rowLabels().map(label => label.split(',')[0])).toEqual([
      'newest@example.com',
      'older@example.com',
    ]);
    expect(screen.getByText('승인 2026. 9. 1. 09:12')).toBeTruthy();
  });

  test('세_상태가_한_목록에_상태_배지와_함께_섞여_보인다', async () => {
    server.use(
      http.get(PROCESSED, () =>
        HttpResponse.json(
          processedPage([
            processedItem({user_id: 7, email: 'approved@example.com'}),
            processedItem({
              user_id: 8,
              email: 'suspended@example.com',
              status: 'SUSPENDED',
              status_label: '정지됨',
              processed_at: '2026-09-06T09:03:00Z',
              processed_at_prefix: '정지',
              suspended_at: '2026-09-06T09:03:00Z',
            }),
            processedItem({
              user_id: 9,
              email: 'rejected@example.com',
              status: 'REJECTED',
              status_label: '거절됨',
              processed_at: '2026-09-02T02:40:00Z',
              processed_at_prefix: '거절',
              approved_at: null,
              rejected_at: '2026-09-02T02:40:00Z',
            }),
          ]),
        ),
      ),
    );

    await renderProcessed();

    expect(await screen.findByText('approved@example.com', {}, {timeout: 3000})).toBeTruthy();
    // 배지 라벨은 서버가 내린 문자열이다 — 앱이 `status` 로 한국어를 고르지 않는다 (§3.4 / C-8).
    expect(screen.getByText('승인됨')).toBeTruthy();
    expect(screen.getByText('정지됨')).toBeTruthy();
    expect(screen.getByText('거절됨')).toBeTruthy();

    // 시각 앞 접두어도 서버 값이고, 시각만 앱이 로컬로 포맷팅한다 (§5.4).
    expect(screen.getByText('정지 2026. 9. 6. 18:03')).toBeTruthy();
    expect(screen.getByText('거절 2026. 9. 2. 11:40')).toBeTruthy();

    // 낭독은 이메일 → 상태 → 시각 순으로 잇는다 (§3.5).
    expect(rowLabels()[1]).toBe('suspended@example.com, 정지됨, 정지 2026년 9월 6일 18시 3분');
  });

  test('처리_완료_목록에는_가입_사유를_보여주지_않는다', async () => {
    // AC-20 이 요구하는 것은 이메일과 처리 시각이다. 응답에도 가입 사유 필드가 없다 (§5.4).
    server.use(http.get(PROCESSED, () => HttpResponse.json(processedPage([processedItem()]))));

    await renderProcessed();

    expect(await screen.findByText('hana@example.com', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByText('가입 사유')).toBeNull();
  });

  test('처리_완료_세그먼트에는_숫자를_붙이지_않는다', async () => {
    server.use(http.get(PROCESSED, () => HttpResponse.json(processedPage([processedItem()]))));

    await renderProcessed();
    await screen.findByText('hana@example.com', {}, {timeout: 3000});

    // 처리된 계정은 쌓이기만 하고 관리자가 확인해야 할 잔여량이 아니다 (§5.2).
    expect(screen.getByRole('tab', {name: '처리 완료'})).toBeTruthy();
    // `처리 완료` 를 보는 동안에도 대기 건수는 살아 있다 — 같은 응답이 그 값을 싣는다.
    expect(screen.getByText('검토 대기 3')).toBeTruthy();
  });
});

describe('비어있음 — design.md §5.8', () => {
  test('처리한_신청이_없으면_아직_처리한_신청이_없어요_가_보인다', async () => {
    server.use(http.get(PROCESSED, () => HttpResponse.json(processedPage([]))));

    await renderProcessed();

    expect(await screen.findByText('아직 처리한 신청이 없어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('승인하거나 거절한 신청이 여기에 표시돼요.')).toBeTruthy();
    // 검토 대기 쪽 빈 상태 문구가 섞이지 않는다 — 세그먼트마다 다른 문구다 (§5.8).
    expect(screen.queryByText('검토할 신청이 없어요')).toBeNull();
  });
});

describe('로딩 — design.md §5.7', () => {
  test('처리_완료로_전환하면_그_목록의_스켈레톤이_보인다', async () => {
    server.use(
      http.get(PROCESSED, async () => {
        await new Promise<void>(resolve => {
          setTimeout(resolve, 150);
        });
        return HttpResponse.json(processedPage([processedItem()]));
      }),
    );

    await renderProcessed();

    expect(screen.getByLabelText('불러오는 중')).toBeTruthy();
    expect(await screen.findByText('hana@example.com', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('오류 — AC-8 계열 (design.md §5.9 · §5.10)', () => {
  test('서버_500_이면_명단을_불러오지_못했어요_와_다시_시도가_보인다', async () => {
    let attempt = 0;
    server.use(
      http.get(PROCESSED, () => {
        attempt += 1;
        return attempt === 1
          ? HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500})
          : HttpResponse.json(processedPage([processedItem({email: 'recovered@example.com'})]));
      }),
    );

    await renderProcessed();

    expect(await screen.findByText('명단을 불러오지 못했어요', {}, {timeout: 3000})).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', {name: '다시 시도'}));

    expect(await screen.findByText('recovered@example.com', {}, {timeout: 3000})).toBeTruthy();
  });

  test('네트워크가_끊기면_연결을_확인해_주세요_가_보인다', async () => {
    server.use(http.get(PROCESSED, () => HttpResponse.error()));

    await renderProcessed();

    expect(await screen.findByText('연결을 확인해 주세요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('네트워크에 연결되면 다시 불러올게요.')).toBeTruthy();
  });

  test('AC3_403_ADMIN_FORBIDDEN_이면_권한_없음_화면이_된다', async () => {
    server.use(
      http.get(PROCESSED, () =>
        HttpResponse.json(problemBody({status: 403, code: 'ADMIN_FORBIDDEN'}), {status: 403}),
      ),
    );

    await renderProcessed();

    expect(await screen.findByText('관리자만 볼 수 있어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByText('다시 시도')).toBeNull();
  });
});
