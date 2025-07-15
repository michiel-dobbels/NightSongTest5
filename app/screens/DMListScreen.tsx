import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Alert, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import debounce from 'lodash/debounce';

interface User {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

interface Contact {
  other_id: string;
  last_message_at: string;
  otherUser?: User;
}

interface Interaction {
  other_id: string | null;
  created_at: string;
}

const DMListScreen = ({ navigation }: { navigation: any }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const user = supabase.auth.user();
    if (!user) {
      Alert.alert('Please log in to view conversations.');
      setLoading(false);
      return;
    }
    fetchContacts(user.id);
  }, []);

  const fetchContacts = async (currentUserId: string) => {
    try {
      const { data: sent, error: sentError } = await supabase
        .from('messages')
        .select('recipient_id, created_at')
        .eq('sender_id', currentUserId);

      if (sentError) throw sentError;

      const { data: received, error: receivedError } = await supabase
        .from('messages')
        .select('sender_id, created_at')
        .eq('recipient_id', currentUserId);

      if (receivedError) throw receivedError;

      const allInteractions: Interaction[] = [
        ...(sent || []).map((s: { recipient_id: string | null; created_at: string }) => ({ other_id: s.recipient_id, created_at: s.created_at })),
        ...(received || []).map((r: { sender_id: string | null; created_at: string }) => ({ other_id: r.sender_id, created_at: r.created_at })),
      ];

      const grouped: { [key: string]: Contact } = allInteractions.reduce((acc: { [key: string]: Contact }, i: Interaction) => {
        const key = i.other_id;
        if (!key) return acc;
        if (!acc[key] || new Date(acc[key].last_message_at) < new Date(i.created_at)) {
          acc[key] = { other_id: key, last_message_at: i.created_at };
        }
        return acc;
      }, {});

      const uniqueContacts: Contact[] = Object.values(grouped);

      if (uniqueContacts.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', uniqueContacts.map((u: Contact) => u.other_id));

        if (profilesError) throw profilesError;

        const formatted: Contact[] = uniqueContacts.map((c: Contact) => ({
          ...c,
          otherUser: (profiles as User[]).find((p: User) => p.id === c.other_id),
        })).sort((a: Contact, b: Contact) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

        setContacts(formatted);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query) {
      setSearchedUsers([]);
      return;
    }

    const user = supabase.auth.user();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('display_name', `%${query}%`)
        .neq('id', user.id);

      if (error) throw error;
      setSearchedUsers(data as User[]);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const debouncedSearch = debounce(searchUsers, 300);  // Debounce for auto-complete

  const startChat = (otherUserId: string, otherUser: User = {} as User) => {
    const user = supabase.auth.user();
    if (!user) return;
    navigation.navigate('DMChat', { otherUserId, otherUser });
    setSearchText('');
    setSearchedUsers([]);
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.item} onPress={() => startChat(item.id, item)}>
      <View style={styles.itemContainer}>
        <Image
          source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <Text>{item.display_name || item.username || 'User'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity style={styles.item} onPress={() => startChat(item.other_id, item.otherUser || {} as User)}>
      <View style={styles.itemContainer}>
        <Image
          source={{ uri: item.otherUser?.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <Text>{item.otherUser?.display_name || item.otherUser?.username || `(Last message: ${new Date(item.last_message_at).toLocaleString()})`}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search users by display name..."
        value={searchText}
        onChangeText={(text: string) => {
          setSearchText(text);
          debouncedSearch(text);
        }}
      />
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <>
          {searchedUsers.length > 0 ? (
            <FlatList
              data={searchedUsers}
              renderItem={renderUserItem}
              keyExtractor={(item: User) => item.id}
              ListHeaderComponent={<Text>Search Results</Text>}
            />
          ) : (
            <FlatList
              data={contacts}
              renderItem={renderContactItem}
              keyExtractor={(item: Contact) => item.other_id}
              ListEmptyComponent={<Text>No conversations yet. Use the search bar to start one.</Text>}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#2c2c54' },
  searchBar: { height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 10, padding: 10 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  itemContainer: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
});

export default DMListScreen;