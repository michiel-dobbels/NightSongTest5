import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Buffer } from 'buffer';
import process from 'process';

import AuthProvider from './AuthContext';
import Navigator from './Navigator';
import { PostStoreProvider } from './app/contexts/PostStoreContext';
import { StoryStoreProvider } from './app/contexts/StoryStoreContext';
import { SignalProvider } from './utils/signal/SignalContext'; // ✅ ADD THIS

import 'react-native-get-random-values'; // ✅ Needed by libsignal

global.Buffer = Buffer;
global.process = process;

// Hermes does not recognize the 'utf-16le' alias used by some libraries.
// Normalize the encoding so Buffer.from works without throwing.
const originalFrom = Buffer.from.bind(Buffer);
Buffer.from = ((data: any, encoding?: BufferEncoding) => {
  if (encoding === 'utf-16le') {
    encoding = 'utf16le';
  }
  // @ts-ignore - BufferEncoding type may not include utf-16le
  return originalFrom(data, encoding as any);
}) as typeof Buffer.from;

const originalIsEncoding = Buffer.isEncoding.bind(Buffer);
Buffer.isEncoding = ((encoding: string) => {
  return encoding === 'utf-16le' ? true : originalIsEncoding(encoding);
}) as typeof Buffer.isEncoding;

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

