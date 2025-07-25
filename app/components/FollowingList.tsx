import React from 'react';
import { View, Text, Image, FlatList, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';
import { useStories } from '../contexts/StoryStoreContext';
import { storyRing } from '../styles/storyRing';

export interface FollowingUser {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface FollowingListProps {
  users: FollowingUser[];
}

export default function FollowingList({ users }: FollowingListProps) {
  const { getStoriesForUser } = useStories();
  const renderItem = ({ item }: { item: FollowingUser }) => {
    const hasStory = getStoriesForUser(item.id).length > 0;
    return (
      <View style={styles.row}>
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={[styles.avatar, hasStory && storyRing]}
          />
        ) : (
          <View style={[styles.avatar, styles.placeholder, hasStory && storyRing]} />
        )}
        <View>
          {item.name && <Text style={styles.fullName}>{item.name}</Text>}

          {item.username && (
            <Text style={styles.username}>@{item.username}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={users}
      keyExtractor={(item, index) => item.username ?? index.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  placeholder: {
    backgroundColor: '#555',
  },
  fullName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    color: colors.text,
    fontSize: 14,
    opacity: 0.8,
  },
});
