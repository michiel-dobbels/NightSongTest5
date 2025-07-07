import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getOrCreateKeys } from './lib/keygen';

export default function ChatScreen() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      console.log('🟢 ChatScreen mounted');
      const keys = await getOrCreateKeys();
      console.log('🔑 Key status:', keys ? 'loaded' : 'failed');
      if (isMounted) setReady(true);
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {ready && <Text>🔐 E2EE Ready</Text>}
    </View>
  );
}
