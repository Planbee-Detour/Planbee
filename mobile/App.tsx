import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AppProviders} from './src/app/providers';
import {clearPreferredRegion, loadPreferredRegion, resolveCurrentRegion, savePreferredRegion} from './src/shared/location/location';

function HomeScreen() {
  const [selectedTab, setSelectedTab] = useState('홈');
  const [region, setRegion] = useState<string | null>(null);
  const [isResolvingRegion, setIsResolvingRegion] = useState(true);

  useEffect(() => {
    const preferredRegion = loadPreferredRegion();
    if (preferredRegion) {
      setRegion(preferredRegion);
      setIsResolvingRegion(false);
      return;
    }

    resolveCurrentRegion().then(currentRegion => {
      if (currentRegion) {
        savePreferredRegion(currentRegion);
        setRegion(currentRegion);
      }
      setIsResolvingRegion(false);
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FCFAF5" />
      {selectedTab === '홈' ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.logo}>Planbee</Text>
              <Text style={styles.location}>● {isResolvingRegion ? '지역 확인 중' : region ?? '지역을 설정해 주세요'}⌄</Text>
            </View>
            <Pressable accessibilityLabel="알림" accessibilityRole="button" style={styles.notification}>
              <Text style={styles.notificationIcon}>♧</Text>
            </Pressable>
          </View>

          <View style={styles.greeting}>
            <Text style={styles.greetingTitle}>지금 어떤 도움이 필요하세요?</Text>
            <Text style={styles.greetingBody}>계획이 바뀌어도 괜찮아요.{`\n`}Planbee가 다음 계획을 찾아드릴게요.</Text>
          </View>

          <Pressable accessibilityRole="button" style={({pressed}) => [styles.aiCard, pressed && styles.pressed]}>
            <View style={styles.aiBadge}><Text style={styles.aiSpark}>✦</Text></View>
            <View style={styles.aiCopy}>
              <Text style={styles.aiLabel}>Planbee AI에게 물어보기</Text>
              <Text style={styles.aiTitle}>지금 상황을 알려주세요</Text>
              <Text style={styles.aiBody}>현재 위치와 시간을 바탕으로{`\n`}새로운 계획을 추천해드릴게요.</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>빠르게 도움받기</Text>
          <View style={styles.quickActions}>
            {[['⌖', '근처 추천'], ['◷', '남는 시간'], ['⇄', '일정 변경'], ['♧', '코스 추천']].map(([icon, label]) => (
              <Pressable key={label} accessibilityRole="button" style={({pressed}) => [styles.quickAction, pressed && styles.pressed]}>
                <Text style={styles.quickIcon}>{icon}</Text>
                <Text style={styles.quickLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>지금 주변에는</Text>
            <Pressable accessibilityRole="button"><Text style={styles.more}>더보기 ›</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeList}>
            <PlaceCard image="https://images.unsplash.com/photo-1786157986916-523f3b64be2a?auto=format&fit=crop&w=600&q=80" category="역사·문화" status="운영중" name="경복궁" distance="850m · 도보 12분" tags="#역사  #사진명소" />
            <PlaceCard image="https://images.unsplash.com/photo-1707925547023-eeb1eaa1005d?auto=format&fit=crop&w=600&q=80" category="거리·골목" status="운영중" name="익선동 한옥거리" distance="1.1km · 도보 15분" tags="#카페  #산책" />
            <PlaceCard image="https://images.unsplash.com/photo-1605822107205-16a8b116ffc7?auto=format&fit=crop&w=600&q=80" category="실내·전시" status="오늘 휴관" name="서울공예박물관" distance="600m · 도보 8분" tags="#실내  #전시" />
          </ScrollView>
        </ScrollView>
      ) : (
        selectedTab === '마이' ? (
          <MyScreen region={region} onRegionChange={setRegion} />
        ) : (
          <PlaceholderScreen tab={selectedTab} />
        )
      )}
      <View style={styles.tabBar}>
        {[['⌂', '홈'], ['⌕', '탐색'], ['▣', '저장'], ['♙', '마이']].map(([icon, label], index) => (
          <Pressable key={label} accessibilityLabel={`${label} 메뉴`} accessibilityRole="button" onPress={() => setSelectedTab(label)} style={[styles.tab, selectedTab === label && styles.activeTab]}>
            <Text style={[styles.tabIcon, selectedTab === label && styles.activeTabText]}>{icon}</Text>
            <Text style={[styles.tabLabel, selectedTab === label && styles.activeTabText]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function PlaceholderScreen({tab}: {tab: string}) {
  const descriptions: Record<string, string> = {
    탐색: '새로운 장소와 계획을 찾아보세요.',
    저장: '저장한 장소와 계획을 모아볼 수 있어요.',
    마이: '나의 프로필과 계획을 관리해보세요.',
  };

  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>{tab === '탐색' ? '⌕' : tab === '저장' ? '▣' : '♙'}</Text>
      <Text style={styles.placeholderTitle}>{tab}</Text>
      <Text style={styles.placeholderBody}>{descriptions[tab]}</Text>
    </View>
  );
}

function MyScreen({region, onRegionChange}: {region: string | null; onRegionChange: (region: string | null) => void}) {
  const [draftRegion, setDraftRegion] = useState(region ?? '');

  const handleSave = () => {
    const nextRegion = draftRegion.trim();
    if (!nextRegion) {
      clearPreferredRegion();
      onRegionChange(null);
      return;
    }
    savePreferredRegion(nextRegion);
    onRegionChange(nextRegion);
  };

  const handleClear = () => {
    clearPreferredRegion();
    setDraftRegion('');
    onRegionChange(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.settingsContent}>
      <Text style={styles.settingsTitle}>마이</Text>
      <Text style={styles.settingsBody}>주변 장소를 확인할 기준 지역을 설정하세요.</Text>
      <View style={styles.settingsSection}>
        <Text style={styles.settingsLabel}>내 지역</Text>
        <TextInput accessibilityLabel="내 지역" onChangeText={setDraftRegion} placeholder="예: 금천구 가산동" placeholderTextColor="#AAA49A" style={styles.regionInput} value={draftRegion} />
        <Pressable accessibilityRole="button" onPress={handleSave} style={({pressed}) => [styles.saveButton, pressed && styles.pressed]}>
          <Text style={styles.saveButtonText}>지역 저장</Text>
        </Pressable>
        {region ? <Pressable accessibilityRole="button" onPress={handleClear} style={styles.clearButton}><Text style={styles.clearButtonText}>설정 지역 삭제</Text></Pressable> : null}
      </View>
      <View style={styles.locationNotice}>
        <Text style={styles.locationNoticeTitle}>현재 위치 사용</Text>
        <Text style={styles.locationNoticeBody}>설정 지역이 없으면 위치 권한을 요청하고 현재 지역을 자동으로 설정합니다.</Text>
        <ActivityIndicator color="#E5A322" style={styles.locationLoader} />
      </View>
    </ScrollView>
  );
}

function PlaceCard({image, category, status, name, distance, tags}: {image: string; category: string; status: string; name: string; distance: string; tags: string}) {
  return (
    <Pressable accessibilityRole="button" style={({pressed}) => [styles.placeCard, pressed && styles.pressed]}>
      <Image accessibilityLabel={name} source={{uri: image}} style={styles.placeImage} />
      <View style={styles.placeInfo}>
        <View style={styles.placeMeta}><Text style={styles.category}>{category}</Text><Text style={[styles.status, status === '오늘 휴관' && styles.closed]}>{status}</Text></View>
        <Text numberOfLines={1} style={styles.placeName}>{name}</Text>
        <Text style={styles.distance}>{distance}</Text>
        <Text style={styles.tags}>{tags}</Text>
      </View>
    </Pressable>
  );
}

function App() {
  return (
    <AppProviders>
      <HomeScreen />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#FCFAF5'},
  content: {paddingHorizontal: 20, paddingBottom: 94, paddingTop: 6},
  placeholder: {alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 70},
  placeholderIcon: {color: '#E5A322', fontSize: 38},
  placeholderTitle: {color: '#292722', fontSize: 22, fontWeight: '800', marginTop: 16},
  placeholderBody: {color: '#858078', fontSize: 13, marginTop: 8, textAlign: 'center'},
  settingsContent: {padding: 20},
  settingsTitle: {color: '#292722', fontSize: 24, fontWeight: '800', marginTop: 12},
  settingsBody: {color: '#858078', fontSize: 13, marginTop: 8},
  settingsSection: {marginTop: 30},
  settingsLabel: {color: '#292722', fontSize: 13, fontWeight: '800', marginBottom: 10},
  regionInput: {backgroundColor: '#FFFFFF', borderColor: '#E9E5DC', borderRadius: 10, borderWidth: 1, color: '#292722', fontSize: 14, paddingHorizontal: 14, paddingVertical: 13},
  saveButton: {alignItems: 'center', backgroundColor: '#F2B134', borderRadius: 10, marginTop: 10, paddingVertical: 13},
  saveButtonText: {color: '#342B1C', fontSize: 13, fontWeight: '800'},
  clearButton: {alignItems: 'center', paddingVertical: 14},
  clearButtonText: {color: '#D6614F', fontSize: 12},
  locationNotice: {backgroundColor: '#FFF7E2', borderRadius: 10, marginTop: 20, padding: 14},
  locationNoticeTitle: {color: '#8E651D', fontSize: 12, fontWeight: '800'},
  locationNoticeBody: {color: '#8E7B59', fontSize: 11, lineHeight: 17, marginTop: 5},
  locationLoader: {alignSelf: 'flex-start', marginTop: 10},
  header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  logo: {color: '#24211D', fontSize: 17, fontWeight: '800'},
  location: {color: '#8B857A', fontSize: 10, marginTop: 2},
  notification: {alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E9E5DC', borderRadius: 19, borderWidth: 1, height: 38, justifyContent: 'center', width: 38},
  notificationIcon: {color: '#26231F', fontSize: 20},
  greeting: {marginTop: 18},
  greetingTitle: {color: '#211F1B', fontSize: 21, fontWeight: '800'},
  greetingBody: {color: '#858078', fontSize: 12, lineHeight: 18, marginTop: 7},
  aiCard: {alignItems: 'center', backgroundColor: '#FFF0C8', borderRadius: 12, flexDirection: 'row', marginTop: 18, padding: 12},
  aiBadge: {alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, height: 28, justifyContent: 'center', width: 28},
  aiSpark: {color: '#F2B134', fontSize: 17},
  aiCopy: {flex: 1, marginLeft: 10},
  aiLabel: {color: '#D48D11', fontSize: 9, fontWeight: '700'},
  aiTitle: {color: '#342B1C', fontSize: 13, fontWeight: '800', marginTop: 6},
  aiBody: {color: '#6F634D', fontSize: 9, lineHeight: 13, marginTop: 3},
  arrow: {color: '#493A1C', fontSize: 22, paddingHorizontal: 4},
  sectionTitle: {color: '#292722', fontSize: 13, fontWeight: '800', marginTop: 17},
  quickActions: {flexDirection: 'row', gap: 7, marginTop: 10},
  quickAction: {alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#EEEAE2', borderRadius: 10, borderWidth: 1, flex: 1, paddingVertical: 10},
  quickIcon: {color: '#E5A322', fontSize: 19},
  quickLabel: {color: '#6D675E', fontSize: 9, marginTop: 6},
  sectionHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2},
  more: {color: '#9A948A', fontSize: 9},
  placeList: {gap: 10, paddingRight: 20, paddingTop: 10},
  placeCard: {backgroundColor: '#FFFFFF', borderColor: '#ECE9E2', borderRadius: 10, borderWidth: 1, overflow: 'hidden', width: 158},
  placeImage: {height: 105, width: '100%'},
  placeInfo: {padding: 8},
  placeMeta: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  category: {color: '#DA9A1C', fontSize: 8, fontWeight: '700'},
  status: {color: '#3A9B65', fontSize: 8, fontWeight: '700'},
  closed: {color: '#D6614F'},
  placeName: {color: '#39352F', fontSize: 12, fontWeight: '800', marginTop: 5},
  distance: {color: '#8C867D', fontSize: 8, marginTop: 3},
  tags: {color: '#AAA49A', fontSize: 8, marginTop: 6},
  tabBar: {alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E9E5DC', borderRadius: 18, borderWidth: 1, bottom: 10, flexDirection: 'row', height: 58, justifyContent: 'space-around', left: 16, position: 'absolute', right: 16},
  tab: {alignItems: 'center', borderRadius: 15, justifyContent: 'center', minWidth: 52, paddingVertical: 5},
  activeTab: {backgroundColor: '#FFF0C8'},
  tabIcon: {color: '#8E887E', fontSize: 16},
  tabLabel: {color: '#8E887E', fontSize: 8, marginTop: 2},
  activeTabText: {color: '#B47C15'},
  pressed: {opacity: 0.7},
});

export default App;
