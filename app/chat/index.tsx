import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';
import { useAuth } from '../../AuthContext';
import { uploadUserKey } from '../../lib/supabase/userKeys';

const KEYPAIR_STORAGE_KEY = 'e2ee_keypair';

export default function ChatScreen() {
  const { user } = useAuth()!;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!user) return;
      const stored = await AsyncStorage.getItem(KEYPAIR_STORAGE_KEY);
      let publicKey: Uint8Array;
      let secretKey: Uint8Array;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          publicKey = util.decodeBase64(parsed.publicKey);
          secretKey = util.decodeBase64(parsed.secretKey);
        } catch (e) {
          publicKey = nacl.box.keyPair().publicKey;
          secretKey = nacl.box.keyPair().secretKey;
        }
      } else {
        const kp = nacl.box.keyPair();
        publicKey = kp.publicKey;
        secretKey = kp.secretKey;
        await AsyncStorage.setItem(
          KEYPAIR_STORAGE_KEY,
          JSON.stringify({
            publicKey: util.encodeBase64(publicKey),
            secretKey: util.encodeBase64(secretKey),
          })
        );
      }
      await uploadUserKey(user.id, util.encodeBase64(publicKey));
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
