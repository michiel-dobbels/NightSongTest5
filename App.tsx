import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import process from 'process';
import './utils/bufferShim';

import { AuthProvider } from './AuthContext';

import Navigator from './Navigator';
import { PostStoreProvider } from './app/contexts/PostStoreContext';
import { StoryStoreProvider } from './app/contexts/StoryStoreContext';
import { SignalProvider } from './utils/signal/SignalContext'; // ✅ ADD THIS

import 'react-native-get-random-values'; // ✅ Needed by libsignal


global.process = process;



export default function App() {
  return (
    <AuthProvider>
      <PostStoreProvider>
        <StoryStoreProvider>
          <SignalProvider>
            <NavigationContainer>
              <Navigator />
            </NavigationContainer>
          </SignalProvider>
        </StoryStoreProvider>
      </PostStoreProvider>
    </AuthProvider>
  );
}

