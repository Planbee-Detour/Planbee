import React from 'react';

import {AppNavigator} from './src/app/AppNavigator';
import {AppProviders} from './src/app/providers';

function App() {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}

export default App;
