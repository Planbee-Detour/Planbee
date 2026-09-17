/** 세션 복원 여부와 무관하게 홈을 먼저 보여 준다 (auth design.md §0). */
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {MainNavigator} from './MainNavigator';

export function RootNavigator() {
  return <NavigationContainer><MainNavigator /></NavigationContainer>;
}
