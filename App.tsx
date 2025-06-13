import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './AuthContext';
import Navigator from './Navigator';
import { PostStoreProvider } from './app/contexts/PostStoreContext';

import { Buffer } from 'buffer';
import process from 'process';

global.Buffer = Buffer;
global.process = process;

export default function App() {
  return (
    <AuthProvider>
      <PostStoreProvider>
        <NavigationContainer>
          <Navigator />
        </NavigationContainer>
      </PostStoreProvider>
    </AuthProvider>
  );
}

