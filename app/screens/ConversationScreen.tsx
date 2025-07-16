import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';  // Assumes named export; adjust if default
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Define types (adjust RootStackParamList to match your navigator)
type RootStackParamList = {
  Conversation: { conversationId: string; otherUserId: string };
  // Add other routes here
};

type ConversationScreenRouteProp = RouteProp<RootStackParamList, 'Conversation'>;
type ConversationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Conversation'>;

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface UserProfile {
  display_name: string;
  image_url: string;
}

const ConversationScreen = ({ route, navigation }: {
  route: ConversationScreenRouteProp;
  navigation: ConversationScreenNavigationProp;
}) => {
  const { conversationId, otherUserId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<Message> | null>(null);

  // Fetch authUserId and otherUser
  useEffect(() => {
    const fetchUserData = async () => {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUserId(user?.id || null);

      // Fetch other user profile
      const { data } = await supabase
        .from('profiles')
        .select('display_name, image_url')
        .eq('id', otherUserId)
        .single();
      setOtherUser(data);
    };
    fetchUserData();
  }, [otherUserId]);

  // Update header once otherUser is loaded
  useEffect(() => {
    if (otherUser) {
      navigation.setOptions({
        title: otherUser.display_name || 'Chat',
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            {otherUser.image_url && (
              <Image
                source={{ uri: otherUser.image_url }}
                style={{ width: 30, height: 30, borderRadius: 15, marginLeft: 10 }}
              />
            )}
          </View>
        ),
        headerStyle: { backgroundColor: '#2c2c54' },
        headerTintColor: 'white',
      });
    }
  }, [otherUser, navigation]);

  // Fetch messages and set up realtime
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      flatListRef.current?.scrollToEnd({ animated: true });
    };
    fetchMessages();

    const sub = supabase
      .channel(`messages:conv=${conversationId}`)
      .on<RealtimePostgresChangesPayload<{ [key: string]: any }>>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !authUserId) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: authUserId,
      content: newMessage,
    });
    if (!error) setNewMessage('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === authUserId;
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          marginVertical: 4,
          marginHorizontal: 8,
        }}
      >
        {!isMe && otherUser?.image_url && (
          <Image
            source={{ uri: otherUser.image_url }}
            style={{ width: 30, height: 30, borderRadius: 15, marginRight: 8 }}
          />
        )}
        <View
          style={{
            maxWidth: '70%',
            padding: 12,
            borderRadius: 20,
            backgroundColor: isMe ? '#0070f3' : '#444',
          }}
        >
          <Text style={{ color: 'white' }}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#2c2c54' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={{ flexDirection: 'row', padding: 8, backgroundColor: '#3c3c64' }}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#aaa"
          style={{ flex: 1, backgroundColor: '#555', color: 'white', borderRadius: 20, padding: 12, marginRight: 8 }}
        />
        <TouchableOpacity onPress={sendMessage}>
          <Ionicons name="send" size={24} color="#0070f3" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ConversationScreen;