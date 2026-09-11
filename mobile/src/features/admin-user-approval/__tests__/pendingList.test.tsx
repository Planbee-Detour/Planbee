/**
 * `검토 대기` 세그먼트의 인수조건 검증
 * (PRD AC-3 · AC-5 · AC-6 · AC-7 · AC-8 · AC-9 · AC-33 / design.md §5).
 *
 * 세그먼트마다 <b>로딩 · 정상 · 비어있음 · 오류</b> 네 상태를 따로 갖는다 (§3.6 / M-6).
 * 이 파일은 `검토 대기` 쪽 네 상태와 커서 페이지네이션·새로고침·권한 없음을 본다.
 *
 * API 는 msw 로만 목킹한다 (M-11). 목 응답은 `contract.yaml` 의 example 을 근거로 만들었다.
 */

// 시간대는 `jest.config.js` 에서 `Asia/Seoul` 로 고정한다 — 표기 예시는 그 기준이다 (§3.3).

import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';
import {Text} from 'react-native';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {createTestQueryClient} from '../../../shared/test/queryClient';
import {UserApprovalListScreen} from '../screens/UserApprovalListScreen';

const PENDING = `${API_ORIGIN}/api/v1/admin/users/pending`;
const PROCESSED = `${API_ORIGIN}/api/v1/admin/users/processed`;

/** `PendingUserItem` — contract.yaml 의 example 형태 그대로. */
function pendingItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    user_id: 42,
    email: 'name@example.com',
    signup_reason_text: '여행 중 일정이 자주 바뀌어서 써보고 싶어요.',
    requested_at: '2026-09-05T05:20:00Z',
    is_me: false,
    ...overrides,
  };
}

function pendingPage(items: unknown[], extra: Record<string, unknown> = {}) {
  return {
    items,
    has_next: false,
    next_cursor: null,
    pending_approval_count: items.length,
    ...extra,
  };
}

const emptyProcessed = () =>
  HttpResponse.json({items: [], has_next: false, next_cursor: null, pending_approval_count: 0});

type Params = {Settings: undefined; UserApprovalList: undefined};
const Stack = createNativeStackNavigator<Params>();

/** 뒤로 돌아갈 자리. §5.10 의 "설정으로 돌아가기" 가 실제로 pop 되는지 보려면 아래 화면이 있어야 한다. */
function SettingsStub() {
  return <Text>설정 화면</Text>;
}

async function renderList() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {/* 설정 → 목록으로 들어온 상태에서 시작한다 (§5.1). 뒤로 갈 자리가 있어야 §5.10 을 볼 수 있다 */}
      <NavigationContainer
        initialState={{routes: [{name: 'Settings'}, {name: 'UserApprovalList'}]}}>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="Settings" component={SettingsStub} />
          <Stack.Screen name="UserApprovalList" component={UserApprovalListScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

/** 목록 행은 카드 전체가 하나의 접근성 요소다 (§3.5) — 힌트로 행만 골라낸다. */
const rowLabels = () =>
  screen.getAllByHintText('두 번 눌러 상세를 엽니다').map(row => String(row.props.accessibilityLabel));

describe('정상 — AC-5 · AC-33 (design.md §5.3)', () => {
  test('AC5_대기_3건이_서버가_준_순서대로_이메일_가입사유_신청시각과_함께_보인다', async () => {
    server.use(
      http.get(PENDING, () =>
        HttpResponse.json(
          pendingPage([
            pendingItem({user_id: 42, email: 'newest@example.com', requested_at: '2026-09-05T05:20:00Z'}),
            pendingItem({
              user_id: 41,
              email: 'middle@example.com',
              signup_reason_text: '주말 나들이 계획을 세우고 싶어요.',
              requested_at: '2026-09-04T01:00:00Z',
            }),
            pendingItem({
              user_id: 40,
              email: 'oldest@example.com',
              signup_reason_text: '팀 워크숍 장소를 찾고 있어요.',
              requested_at: '2026-09-03T00:10:00Z',
            }),
          ]),
        ),
      ),
    );

    await renderList();

    expect(await screen.findByText('newest@example.com', {}, {timeout: 3000})).toBeTruthy();
    // 정렬은 서버가 한다 (계약 — `requested_at` 내림차순). 앱은 받은 순서를 바꾸지 않는다.
    expect(rowLabels().map(label => label.split(',')[0])).toEqual([
      'newest@example.com',
      'middle@example.com',
      'oldest@example.com',
    ]);

    // 한 행에 이메일 · 가입 사유 · 신청 시각이 모두 있다.
    expect(screen.getByText('여행 중 일정이 자주 바뀌어서 써보고 싶어요.')).toBeTruthy();
    expect(screen.getByText('신청 2026. 9. 5. 14:20')).toBeTruthy();
    // 낭독은 마침표로 끊기지 않게 풀어 읽는다 (§3.5).
    expect(rowLabels()[0]).toContain('신청 2026년 9월 5일 14시 20분');
  });

  test('AC33_가입_사유가_없는_신청도_서버가_내린_문자열_그대로_같은_모양으로_보인다', async () => {
    // 서버가 대체 문구를 완성해 내린다 — 앱에는 그 문자열도, `null` 분기도 없다 (§5.3 / §9.7).
    server.use(
      http.get(PENDING, () =>
        HttpResponse.json(
          pendingPage([
            pendingItem({user_id: 7, email: 'noreason@example.com', signup_reason_text: '입력하지 않음'}),
          ]),
        ),
      ),
    );

    await renderList();

    expect(await screen.findByText('입력하지 않음', {}, {timeout: 3000})).toBeTruthy();
    // 이메일과 신청 시각은 다른 항목과 똑같이 보인다 (AC-33).
    expect(screen.getByText('noreason@example.com')).toBeTruthy();
    expect(screen.getByText('신청 2026. 9. 5. 14:20')).toBeTruthy();
  });

  test('세그먼트_라벨의_숫자는_서버가_준_대기_건수다', async () => {
    // 목록은 20건씩 끊어 오므로 `items` 길이를 세면 25건일 때 20이 된다 (AC-32 / §5.2).
    server.use(
      http.get(PENDING, () =>
        HttpResponse.json(
          pendingPage([pendingItem()], {has_next: true, next_cursor: 'C1', pending_approval_count: 25}),
        ),
      ),
    );

    await renderList();

    expect(await screen.findByText('검토 대기 25', {}, {timeout: 3000})).toBeTruthy();
    // `처리 완료` 에는 숫자를 붙이지 않는다 (§5.2). "처리됨" 이라는 표기도 쓰지 않는다.
    expect(screen.getByText('처리 완료')).toBeTruthy();
    expect(screen.queryByText('처리됨')).toBeNull();
  });
});

describe('비어있음 — AC-6 (design.md §5.8)', () => {
  test('AC6_대기가_0건이면_검토할_신청이_없어요_가_보인다', async () => {
    server.use(http.get(PENDING, () => HttpResponse.json(pendingPage([]))));

    await renderList();

    expect(await screen.findByText('검토할 신청이 없어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('새 신청이 들어오면 여기에 표시돼요.')).toBeTruthy();
    // 0이면 세그먼트 라벨에 숫자를 붙이지 않는다 (§5.2).
    expect(screen.getByText('검토 대기')).toBeTruthy();
  });

  test('AC9_빈_상태에서도_당겨서_새로고침이_동작한다', async () => {
    let attempt = 0;
    server.use(
      http.get(PENDING, () => {
        attempt += 1;
        return HttpResponse.json(
          attempt === 1 ? pendingPage([]) : pendingPage([pendingItem({email: 'fresh@example.com'})]),
        );
      }),
    );

    await renderList();
    await screen.findByText('검토할 신청이 없어요', {}, {timeout: 3000});

    await fireEvent(screen.getByTestId('admin-pending-list'), 'refresh');

    expect(await screen.findByText('fresh@example.com', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('로딩 — design.md §5.7', () => {
  test('첫_진입에는_스켈레톤이_보이고_세그먼트는_그동안에도_조작할_수_있다', async () => {
    server.use(
      http.get(PENDING, async () => {
        await new Promise<void>(resolve => {
          setTimeout(resolve, 150);
        });
        return HttpResponse.json(pendingPage([pendingItem()]));
      }),
      http.get(PROCESSED, emptyProcessed),
    );

    await renderList();

    expect(screen.getByLabelText('불러오는 중')).toBeTruthy();
    // 세그먼트와 화면 제목은 즉시 렌더된다 (§5.7 · §3.6).
    expect(screen.getByText('처리 완료')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', {name: '처리 완료'}));
    expect(await screen.findByText('아직 처리한 신청이 없어요', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('오류 — AC-8 (design.md §5.9)', () => {
  test('AC8_서버_500_이면_명단을_불러오지_못했어요_와_다시_시도가_보인다', async () => {
    let attempt = 0;
    server.use(
      http.get(PENDING, () => {
        attempt += 1;
        return attempt === 1
          ? HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500})
          : HttpResponse.json(pendingPage([pendingItem({email: 'recovered@example.com'})]));
      }),
    );

    await renderList();

    expect(await screen.findByText('명단을 불러오지 못했어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('잠시 후 다시 시도해 주세요.')).toBeTruthy();

    // "다시 시도" 는 그 세그먼트의 목록만 다시 불러온다 — 화면을 리마운트하지 않는다 (§5.9).
    await fireEvent.press(screen.getByRole('button', {name: '다시 시도'}));

    expect(await screen.findByText('recovered@example.com', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('가입 신청 관리')).toBeTruthy();
  });

  test('AC8_네트워크가_끊기면_연결을_확인해_주세요_가_보인다', async () => {
    server.use(http.get(PENDING, () => HttpResponse.error()));

    await renderList();

    expect(await screen.findByText('연결을 확인해 주세요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('네트워크에 연결되면 다시 불러올게요.')).toBeTruthy();
  });

  test('한쪽_세그먼트가_오류여도_다른_쪽은_정상이다', async () => {
    // 세그먼트를 바꾸면 다른 목록이다 — 한쪽의 실패가 다른 쪽을 가리지 않는다 (§3.6).
    server.use(
      http.get(PENDING, () =>
        HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500}),
      ),
      http.get(PROCESSED, () =>
        HttpResponse.json({
          items: [
            {
              user_id: 7,
              email: 'hana@example.com',
              status: 'APPROVED',
              status_label: '승인됨',
              processed_at: '2026-09-01T00:12:00Z',
              processed_at_prefix: '승인',
              approved_at: '2026-09-01T00:12:00Z',
              suspended_at: null,
              rejected_at: null,
              is_me: false,
            },
          ],
          has_next: false,
          next_cursor: null,
          pending_approval_count: 0,
        }),
      ),
    );

    await renderList();
    await screen.findByText('명단을 불러오지 못했어요', {}, {timeout: 3000});

    await fireEvent.press(screen.getByRole('tab', {name: '처리 완료'}));

    expect(await screen.findByText('hana@example.com', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByText('명단을 불러오지 못했어요')).toBeNull();
  });
});

describe('권한 없음 — AC-3 (design.md §5.10)', () => {
  test('AC3_403_ADMIN_FORBIDDEN_이면_관리자만_볼_수_있어요_화면이_되고_다시_시도가_없다', async () => {
    server.use(
      http.get(PENDING, () =>
        HttpResponse.json(problemBody({status: 403, code: 'ADMIN_FORBIDDEN'}), {status: 403}),
      ),
    );

    await renderList();

    expect(await screen.findByText('관리자만 볼 수 있어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('이 화면을 볼 수 있는 권한이 없어요.')).toBeTruthy();
    // 다시 눌러도 같은 결과이므로 "다시 시도" 를 두지 않는다 (§5.10).
    expect(screen.queryByText('다시 시도')).toBeNull();

    await fireEvent.press(screen.getByRole('button', {name: '설정으로 돌아가기'}));

    expect(await screen.findByText('설정 화면', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('페이지네이션 — AC-7 (design.md §5.6)', () => {
  test('AC7_목록_끝에_닿으면_next_cursor_를_그대로_보내_다음_페이지를_불러온다', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(PENDING, ({request}) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return HttpResponse.json(
          cursor === null
            ? pendingPage([pendingItem({user_id: 42, email: 'page1@example.com'})], {
                has_next: true,
                next_cursor: 'eyJ0IjoiMjAyNi0wOS0wNVQwNToyMDowMFoiLCJpIjo0Mn0',
                pending_approval_count: 25,
              })
            : pendingPage([pendingItem({user_id: 21, email: 'page2@example.com'})], {
                pending_approval_count: 25,
              }),
        );
      }),
    );

    await renderList();
    await screen.findByText('page1@example.com', {}, {timeout: 3000});

    await fireEvent(screen.getByTestId('admin-pending-list'), 'endReached');

    expect(await screen.findByText('page2@example.com', {}, {timeout: 3000})).toBeTruthy();
    // 앱은 커서를 해석하지 않는다 — 직전 응답의 값을 그대로 되돌려 보낸다 (계약 `parameters.Cursor`).
    expect(cursors).toEqual([null, 'eyJ0IjoiMjAyNi0wOS0wNVQwNToyMDowMFoiLCJpIjo0Mn0']);
    // 첫 페이지 항목은 그대로 남고 이어붙는다.
    expect(screen.getByText('page1@example.com')).toBeTruthy();
    expect(screen.getByText('모두 확인했어요')).toBeTruthy();
  });

  test('AC7_has_next_가_거짓이면_끝에_닿아도_더_부르지_않는다', async () => {
    let requests = 0;
    server.use(
      http.get(PENDING, () => {
        requests += 1;
        return HttpResponse.json(pendingPage([pendingItem()]));
      }),
    );

    await renderList();
    await screen.findByText('name@example.com', {}, {timeout: 3000});

    await fireEvent(screen.getByTestId('admin-pending-list'), 'endReached');
    await fireEvent(screen.getByTestId('admin-pending-list'), 'endReached');

    await waitFor(() => expect(requests).toBe(1));
    // 한 페이지로 끝났으면 "모두 확인했어요" 를 띄우지 않는다 (§5.6) —
    // 애초에 더 있을 거라 기대하지 않은 상태다.
    expect(screen.queryByText('모두 확인했어요')).toBeNull();
  });

  /**
   * <b>DEF-T01 — 해소</b> (`defects.md` 2026-09-09 mobile-tester → 2026-09-11 수정).
   *
   * 화면이 `active.isError` 하나로 본문 전체를 §5.9 오류 블록으로 바꿨었다. react-query 는
   * 이미 받은 데이터가 있어도 추가 페이지 요청이 실패하면 쿼리 상태를 `error` 로 만드는데,
   * 화면은 이제 `pages.length === 0` 일 때만(최초 로드 실패) 전체 오류 블록을 보여준다 —
   * 이미 페이지가 있으면 §5.6 의 "더 불러오지 못했어요" 푸터로만 알린다.
   */
  test('AC7_다음_페이지_로드에_실패하면_이미_불러온_항목은_남고_다시_시도로_이어붙인다', async () => {
    let attempt = 0;
    server.use(
      http.get(PENDING, ({request}) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor === null) {
          return HttpResponse.json(
            pendingPage([pendingItem({email: 'page1@example.com'})], {
              has_next: true,
              next_cursor: 'C1',
              pending_approval_count: 25,
            }),
          );
        }
        attempt += 1;
        return attempt === 1
          ? HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500})
          : HttpResponse.json(
              pendingPage([pendingItem({user_id: 21, email: 'page2@example.com'})], {
                pending_approval_count: 25,
              }),
            );
      }),
    );

    await renderList();
    await screen.findByText('page1@example.com', {}, {timeout: 3000});

    await fireEvent(screen.getByTestId('admin-pending-list'), 'endReached');

    expect(await screen.findByText('더 불러오지 못했어요', {}, {timeout: 3000})).toBeTruthy();
    // 이미 불러온 항목은 그대로 남는다 (§5.6).
    expect(screen.getByText('page1@example.com')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', {name: '다시 시도'}));

    expect(await screen.findByText('page2@example.com', {}, {timeout: 3000})).toBeTruthy();
  });
});

describe('당겨서 새로고침 — AC-9 (design.md §5.5)', () => {
  test('AC9_당기면_첫_페이지부터_다시_불러와_최신_목록으로_갱신된다', async () => {
    const cursors: (string | null)[] = [];
    let refreshed = false;
    server.use(
      http.get(PENDING, ({request}) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        if (cursor !== null) {
          return HttpResponse.json(
            pendingPage([pendingItem({user_id: 21, email: 'page2@example.com'})], {
              pending_approval_count: 25,
            }),
          );
        }
        return HttpResponse.json(
          pendingPage([pendingItem({email: refreshed ? 'fresh@example.com' : 'stale@example.com'})], {
            has_next: true,
            next_cursor: 'C1',
            pending_approval_count: 25,
          }),
        );
      }),
    );

    await renderList();
    await screen.findByText('stale@example.com', {}, {timeout: 3000});
    await fireEvent(screen.getByTestId('admin-pending-list'), 'endReached');
    await screen.findByText('page2@example.com', {}, {timeout: 3000});

    refreshed = true;
    await fireEvent(screen.getByTestId('admin-pending-list'), 'refresh');

    expect(await screen.findByText('fresh@example.com', {}, {timeout: 3000})).toBeTruthy();
    // 첫 페이지부터 다시 가져온다 — 이미 불러온 2페이지는 버린다 (§5.5).
    expect(cursors[cursors.length - 1]).toBeNull();
    await waitFor(() => expect(screen.queryByText('page2@example.com')).toBeNull());
  });

  test('AC9_새로고침에_실패하면_새로_고치지_못했어요_배너가_뜬다', async () => {
    server.use(
      http.get(PENDING, () => failAfterFirstPage([pendingItem({email: 'kept@example.com'})])),
    );

    await renderList();
    await screen.findByText('kept@example.com', {}, {timeout: 3000});

    await fireEvent(screen.getByTestId('admin-pending-list'), 'refresh');

    expect(await screen.findByText('새로 고치지 못했어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getAllByText('잠시 후 다시 시도해 주세요.').length).toBeGreaterThan(0);
  });

  /**
   * <b>DEF-T01 — 해소</b> (`defects.md` 2026-09-09 mobile-tester → 2026-09-11 수정).
   *
   * §5.5 는 "기존 목록을 유지" 하고 배너만 띄우라고 못 박았는데("이미 보고 있던 내용을 실패가
   * 지우면 안 된다"), 실제로는 보고 있던 목록이 사라지고 §5.9 오류 블록이 그 자리를 덮었었다.
   * 원인은 위 AC-7 항목과 같다 — 이제 `pages.length === 0` 조건으로 갈라 재발하지 않는다.
   */
  test('AC9_새로고침에_실패해도_보고_있던_목록은_남는다', async () => {
    server.use(
      http.get(PENDING, () => failAfterFirstPage([pendingItem({email: 'kept@example.com'})])),
    );

    await renderList();
    await screen.findByText('kept@example.com', {}, {timeout: 3000});

    await fireEvent(screen.getByTestId('admin-pending-list'), 'refresh');
    await screen.findByText('새로 고치지 못했어요', {}, {timeout: 3000});

    // 목록을 오류 화면으로 대체하지 않는다 (§5.5).
    expect(screen.getByText('kept@example.com')).toBeTruthy();
    expect(screen.queryByText('명단을 불러오지 못했어요')).toBeNull();
  });
});

/** 첫 요청만 성공하고 그 뒤로는 500 을 내는 핸들러 — 새로고침 실패를 만든다. */
let firstPageServed = false;
beforeEach(() => {
  firstPageServed = false;
});

function failAfterFirstPage(items: unknown[]) {
  if (firstPageServed) {
    return HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500});
  }
  firstPageServed = true;
  return HttpResponse.json(pendingPage(items));
}
