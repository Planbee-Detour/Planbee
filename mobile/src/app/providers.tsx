/**
 * 앱 전역 프로바이더. 기능(features/)은 이 계층에 의존하지 않는다. (mobile.md M-2)
 */
import React, {useState, type PropsWithChildren} from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {ApiError} from '../shared/api/problem';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 4xx 는 다시 보내도 결과가 같다. 401 갱신은 authFetch 가 이미 처리했다. (M-14)
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {retry: false},
    },
  });
}

export function AppProviders({children}: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
