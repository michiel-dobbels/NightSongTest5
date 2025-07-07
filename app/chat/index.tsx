import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '../../AuthContext';
import { getOrCreateChatKeys } from '../../lib/chatKeys';

export default function ChatScreen() {
  const { user } = useAuth()!;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!user) return;
      await getOrCreateChatKeys(user.id);
      if (isMounted) setReady(true);
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {ready && <Text>🔐 E2EE Chat Ready</Text>}
    </View>
  );
}
