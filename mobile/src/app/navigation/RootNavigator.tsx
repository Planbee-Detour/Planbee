/**
 * 세션 상태에 따라 스택 하나만 마운트한다 (design.md §1.1).
 *
 * 세션이 없을 때의 첫 화면은 항상 스플래시다 — 저장된 토큰으로 복원할 수 있는지 먼저 판정하고,
 * 그 결과에 따라 로그인 화면이나 계정 상태 안내로 <b>스택을 교체</b>한다.
 * 교체(reset)로 이동하므로 사용자가 뒤로 가서 스플래시나 폼으로 돌아가지 않는다.
 */
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {AccountDeleteScreen} from '../../features/auth/screens/AccountDeleteScreen';
import {AccountStatusScreen} from '../../features/auth/screens/AccountStatusScreen';
import {LegalDocumentScreen} from '../../features/auth/screens/LegalDocumentScreen';
import {LoginScreen} from '../../features/auth/screens/LoginScreen';
import {SignUpScreen} from '../../features/auth/screens/SignUpScreen';
import {SplashScreen} from '../../features/auth/screens/SplashScreen';
import {useSession} from '../../features/auth/hooks/useSession';
import {MainNavigator} from './MainNavigator';
import type {AuthStackParamList} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{headerShown: false}}>
      {/* 스플래시와 상태 안내는 되돌아갈 곳이 없다 — 스와이프 백을 끈다 (design.md §1.3) */}
      <AuthStack.Screen name="Splash" component={SplashScreen} options={{gestureEnabled: false}} />
      <AuthStack.Screen name="Login" component={LoginScreen} options={{gestureEnabled: false}} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen
        name="AccountStatus"
        component={AccountStatusScreen}
        options={{gestureEnabled: false}}
      />
      <AuthStack.Screen name="AccountDelete" component={AccountDeleteScreen} />
      <AuthStack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={{presentation: 'modal'}}
      />
    </AuthStack.Navigator>
  );
}

export function RootNavigator() {
  const isSignedIn = useSession(state => state.isSignedIn);

  return (
    <NavigationContainer>{isSignedIn ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>
  );
}
