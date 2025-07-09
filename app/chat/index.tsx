import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../AuthContext';
import { getOrCreateChatKeys } from '../../lib/chatKeys';


export default function ChatScreen() {
  console.log('🟢 ChatScreen mounted');

  const { user } = useAuth()!;
  const { recipientId } = useLocalSearchParams<{ recipientId?: string }>();
  const [ready, setReady] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!user) return;
      console.log('🧠 Running getOrCreateChatKeys for:', user?.id);

      await getOrCreateChatKeys(user.id);

      if (isMounted) setReady(true);
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleSend = () => {
    const body = text.trim();
    if (!body || !recipientId) return;
    onSend(body, String(recipientId));
    setText('');
  };

  const onSend = (message: string, toId: string) => {
    console.log('Send encrypted message', message, 'to', toId);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {ready && <Text>🔐 E2EE Chat Ready</Text>}
      </View>
      <View style={styles.inputBar}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message"
          style={styles.input}
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f2f2f2',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007aff',
    padding: 10,
    borderRadius: 20,
  },
});
