import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './AuthContext';
import { LikeProvider } from './LikeContext';
import Navigator from './Navigator';
import { LikeProvider } from './LikeContext';

import { Buffer } from 'buffer';
import process from 'process';

global.Buffer = Buffer;
global.process = process;

export default function App() {
  return (
    <AuthProvider>
      <LikeProvider>
        <NavigationContainer>
          <Navigator />
        </NavigationContainer>
      </LikeProvider>
    </AuthProvider>
  );
}

