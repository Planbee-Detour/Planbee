import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

const API_BASE_URL = 'http://localhost:8080';
type ApiState = 'loading' | 'online' | 'offline';

function HomeScreen() {
  const [apiState, setApiState] = useState<ApiState>('loading');

  const checkApi = useCallback(async () => {
    setApiState('loading');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`);
      setApiState(response.ok ? 'online' : 'offline');
    } catch {
      setApiState('offline');
    }
  }, []);

  useEffect(() => {
    checkApi();
  }, [checkApi]);

  const statusLabel = {
    loading: '서버 연결 확인 중',
    online: '서버 연결됨',
    offline: '서버를 실행해 주세요',
  }[apiState];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <Text style={styles.eyebrow}>MAKE TODAY COUNT</Text>
          <Text style={styles.title}>Planbee</Text>
          <Text style={styles.subtitle}>
            작은 계획을 모아{`\n`}더 나은 하루를 시작하세요.
          </Text>
        </View>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            {apiState === 'loading' ? (
              <ActivityIndicator color="#F2B134" />
            ) : (
              <View style={[styles.statusDot, apiState === 'online' ? styles.online : styles.offline]} />
            )}
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={checkApi} style={({pressed}) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>다시 확인</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9ED" />
      <HomeScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#FFF9ED'},
  container: {flex: 1, justifyContent: 'space-between', padding: 28},
  brand: {marginTop: 88},
  eyebrow: {color: '#A06A00', fontSize: 12, fontWeight: '700', letterSpacing: 2},
  title: {color: '#24211B', fontSize: 54, fontWeight: '800', letterSpacing: -2, marginTop: 8},
  subtitle: {color: '#655E52', fontSize: 20, lineHeight: 30, marginTop: 16},
  card: {backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#5C420F', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: {width: 0, height: 8}},
  statusRow: {alignItems: 'center', flexDirection: 'row', minHeight: 24},
  statusDot: {borderRadius: 6, height: 12, width: 12},
  online: {backgroundColor: '#32A36A'},
  offline: {backgroundColor: '#D7654D'},
  statusText: {color: '#403B32', fontSize: 16, fontWeight: '600', marginLeft: 12},
  button: {alignItems: 'center', backgroundColor: '#F2B134', borderRadius: 14, marginTop: 18, paddingVertical: 14},
  pressed: {opacity: 0.75},
  buttonText: {color: '#2A2111', fontSize: 16, fontWeight: '700'},
});

export default App;
