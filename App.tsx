import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Buffer } from 'buffer';
import process from 'process';

import { AuthProvider } from './AuthContext';

import Navigator from './Navigator';
import { PostStoreProvider } from './app/contexts/PostStoreContext';
import { StoryStoreProvider } from './app/contexts/StoryStoreContext';
import { SignalProvider } from './utils/signal/SignalContext'; // ✅ ADD THIS

import 'react-native-get-random-values'; // ✅ Needed by libsignal


global.Buffer = Buffer;
global.process = process;

// ✅ Optional: warn instead of crashing
const originalFrom = Buffer.from.bind(Buffer);
Buffer.from = ((data: any, encoding?: BufferEncoding) => {
  if (encoding === 'utf-16le') {
    console.warn('⚠️ utf-16le is not supported in Hermes — falling back to utf-8');
    encoding = 'utf-8';
  }
  return originalFrom(data, encoding as any);
}) as typeof Buffer.from;

const originalIsEncoding = Buffer.isEncoding.bind(Buffer);
Buffer.isEncoding = (encoding: string): encoding is BufferEncoding => {
  if (encoding === 'utf-16le') return false;
  return originalIsEncoding(encoding);
};


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

