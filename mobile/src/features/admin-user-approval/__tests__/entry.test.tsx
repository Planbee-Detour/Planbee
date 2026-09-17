/**
 * 진입점 — 설정 화면의 `관리자` 섹션 (PRD AC-1 · AC-2 · AC-32 / design.md §4).
 *
 * 배선은 `app/navigation/MainNavigator.tsx` 와 같게 만든다 — `SettingsScreen`(auth 소유)이
 * 슬롯을 받고 그 자리에 관리자 기능의 컴포넌트가 들어간다 (M-2 / design.md §4.7).
 * 실제 화면과 같은 조합으로 검증해야 "슬롯이 비어 있어도 통과" 하는 테스트가 되지 않는다.
 *
 * API 는 msw 로만 목킹한다. 서버를 띄우지 않는다 (M-11 / 절대 규칙 5).
 */
import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator, type NativeStackScreenProps} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';

import {API_ORIGIN, problemBody, server} from '../../../shared/test/mswServer';
import {createTestQueryClient} from '../../../shared/test/queryClient';
import {clearTokens} from '../../../shared/api/session';
import {SettingsScreen} from '../../auth/screens/SettingsScreen';
import {useSession} from '../../auth/hooks/useSession';
import {AdminSettingsSection} from '../components/AdminSettingsSection';
import {UserApprovalListScreen} from '../screens/UserApprovalListScreen';

const ME = `${API_ORIGIN}/api/v1/auth/me`;
const PENDING = `${API_ORIGIN}/api/v1/admin/users/pending`;

/** `UserSummary` — contract.yaml 의 example 을 근거로 만든다. */
const admin = (pendingCount: number | null) => ({
  email: 'admin@planbee.app',
  role: 'ADMIN',
  status: 'APPROVED',
  pending_approval_count: pendingCount,
});

const user = () => ({
  email: 'name@example.com',
  role: 'USER',
  status: 'APPROVED',
  // `USER` 에게는 서버가 `null` 을 내린다 (contract.yaml `UserSummary`).
  pending_approval_count: null,
});

const emptyPendingPage = () =>
  HttpResponse.json({items: [], has_next: false, next_cursor: null, pending_approval_count: 0});

type Params = {Settings: undefined; UserApprovalList: undefined};
const Stack = createNativeStackNavigator<Params>();

function SettingsRoute({navigation}: NativeStackScreenProps<Params, 'Settings'>) {
  return (
    <SettingsScreen
      renderExtraSection={account => (
        <AdminSettingsSection
          account={account}
          onPress={() => navigation.push('UserApprovalList')}
        />
      )}
    />
  );
}

async function renderSettings() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName="Settings">
          <Stack.Screen name="Settings" component={SettingsRoute} />
          <Stack.Screen name="UserApprovalList" component={UserApprovalListScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await clearTokens();
  useSession.setState({isSignedIn: true, notice: null, toast: null});
});

describe('관리자 섹션의 렌더 조건 — AC-1 · AC-2 (design.md §4.3)', () => {
  test('AC1_ADMIN_이면_관리자_섹션과_대기_건수가_보인다', async () => {
    server.use(http.get(ME, () => HttpResponse.json(admin(3))));

    await renderSettings();

    expect(await screen.findByText('관리자', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('가입 신청 관리')).toBeTruthy();
    expect(screen.getByText('3건')).toBeTruthy();
    // §4.6 — 낭독은 "라벨, 값" 으로 합쳐 읽는다.
    expect(screen.getByRole('button', {name: '가입 신청 관리, 검토 대기 3건'})).toBeTruthy();
  });

  test('AC1_행을_누르면_가입_신청_관리_화면으로_이동한다', async () => {
    server.use(http.get(ME, () => HttpResponse.json(admin(3))), http.get(PENDING, emptyPendingPage));

    await renderSettings();
    await screen.findByText('3건', {}, {timeout: 3000});

    await fireEvent.press(screen.getByRole('button', {name: '가입 신청 관리, 검토 대기 3건'}));

    // 목록 화면에만 있는 세그먼트로 확인한다 — 화면 제목은 설정 행 라벨과 같은 문자열이다.
    expect(await screen.findByText('처리 완료', {}, {timeout: 3000})).toBeTruthy();
  });

  test('AC2_USER_에게는_관리자_섹션이_아예_없다', async () => {
    server.use(http.get(ME, () => HttpResponse.json(user())));

    await renderSettings();

    // 계정 카드가 그려진 뒤에도 관리자 섹션은 없다.
    expect(await screen.findByText('name@example.com', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByText('관리자')).toBeNull();
    expect(screen.queryByText('가입 신청 관리')).toBeNull();
  });

  test('AC2_역할을_조회하는_동안에도_섹션이_보이지_않는다', async () => {
    // 로딩 중 스켈레톤을 그리면 `USER` 에게도 한 프레임 보인다 — 깜빡임도 AC-2 위반이다 (§4.3).
    server.use(
      http.get(ME, async () => {
        await new Promise<void>(resolve => {
          setTimeout(resolve, 150);
        });
        return HttpResponse.json(admin(3));
      }),
    );

    await renderSettings();

    // 설정 화면의 나머지는 이미 렌더돼 있다.
    expect(screen.getByText('설정')).toBeTruthy();
    expect(screen.queryByText('관리자')).toBeNull();
    expect(screen.queryByText('가입 신청 관리')).toBeNull();

    // 조회가 끝나면 그때 나타난다.
    expect(await screen.findByText('가입 신청 관리', {}, {timeout: 3000})).toBeTruthy();
  });

  test('AC2_역할_조회에_실패하면_섹션이_없고_설정_화면의_나머지는_동작한다', async () => {
    server.use(
      http.get(ME, () =>
        HttpResponse.json(problemBody({status: 500, code: 'INTERNAL_ERROR'}), {status: 500}),
      ),
    );

    await renderSettings();

    expect(await screen.findByText('불러오지 못했어요', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.queryByText('관리자')).toBeNull();
    expect(screen.queryByText('가입 신청 관리')).toBeNull();
    // 화면 전체가 오류로 바뀌지 않는다 — 이메일 행의 "다시 시도" 로 복구한다 (§4.3).
    expect(screen.getByRole('button', {name: '다시 시도'})).toBeTruthy();
  });
});

describe('대기 건수의 출처 — AC-32 (design.md §4.4 · §4.5)', () => {
  test('AC32_건수는_서버가_내린_정수를_그대로_쓴다', async () => {
    // 목록은 20건씩 끊어 오므로 앱이 세면 25건일 때 20이 표시된다 — 세지 않는다는 것의 확인이다.
    server.use(http.get(ME, () => HttpResponse.json(admin(25))));

    await renderSettings();

    expect(await screen.findByText('25건', {}, {timeout: 3000})).toBeTruthy();
    expect(screen.getByRole('button', {name: '가입 신청 관리, 검토 대기 25건'})).toBeTruthy();
  });

  test('대기_0건이면_값_자리를_비우고_낭독은_검토_대기_없음_이다', async () => {
    server.use(http.get(ME, () => HttpResponse.json(admin(0))), http.get(PENDING, emptyPendingPage));

    await renderSettings();
    await screen.findByText('가입 신청 관리', {}, {timeout: 3000});

    // "0건" 을 쓰지 않는다 (§4.4). 낭독에서는 침묵이 정보가 되지 못하므로 상태를 말해 준다 (§4.6).
    expect(screen.queryByText('0건')).toBeNull();
    const row = screen.getByRole('button', {name: '가입 신청 관리, 검토 대기 없음'});

    // 행은 그대로 눌러서 들어갈 수 있다 — AC-6 의 빈 상태를 보러 갈 수 있어야 한다.
    await fireEvent.press(row);
    expect(await screen.findByText('검토할 신청이 없어요', {}, {timeout: 3000})).toBeTruthy();
  });
});
