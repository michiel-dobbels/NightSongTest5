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

// Warn instead of crashing when libraries request utf‑16
const originalFrom = Buffer.from.bind(Buffer);
Buffer.from = ((data: any, encoding?: BufferEncoding) => {
  const enc = typeof encoding === 'string' ? encoding.toLowerCase() : encoding;
  if (enc === 'utf-16le' || enc === 'utf16le' || enc === 'ucs2') {
    console.warn('⚠️ utf-16le is not supported in Hermes — falling back to utf-8');
    encoding = 'utf-8';
  }
  return originalFrom(data, encoding as any);
}) as typeof Buffer.from;



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

