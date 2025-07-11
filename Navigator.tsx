import React, { Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthPage from './AuthPage';

import BottomTabsNavigator from './bottomtabs/BottomTabsNavigator';
import LoadingScreen from './app/components/LoadingScreen';
const ChatScreen = React.lazy(() => import('./app/chat'));
import { useAuth } from './AuthContext';

const Stack = createNativeStackNavigator();

export default function Navigator() {
  const { user, loading } = useAuth()!;

  if (loading) return <LoadingScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Stack.Navigator screenOptions={{ headerShown: false, detachInactiveScreens: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={BottomTabsNavigator} />
            <Stack.Screen name="chat" component={ChatScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthPage} />
        )}

      </Stack.Navigator>
    </Suspense>
  );
}
