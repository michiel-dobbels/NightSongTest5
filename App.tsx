import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './AuthContext';
import Navigator from './Navigator';
import { PostStoreProvider } from './app/contexts/PostStoreContext';
import { StoryStoreProvider } from './app/contexts/StoryStoreContext';
import { NotificationsProvider } from './lib/hooks/useNotifications';

import { Buffer } from 'buffer';
import process from 'process';

global.Buffer = Buffer;
global.process = process;

export default function App() {
  return (
    <AuthProvider>
      <PostStoreProvider>
        <StoryStoreProvider>
          <NotificationsProvider>
            <NavigationContainer>
              <Navigator />
            </NavigationContainer>
          </NotificationsProvider>
        </StoryStoreProvider>
      </PostStoreProvider>
    </AuthProvider>
  );
}

