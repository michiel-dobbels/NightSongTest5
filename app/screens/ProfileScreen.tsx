import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { colors } from '../styles/colors';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth() as any;

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.backButton}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <Text style={styles.username}>@{profile.username}</Text>
      {profile.display_name && (
        <Text style={styles.name}>{profile.display_name}</Text>
      )}
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  username: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  name: {
    color: 'white',
    fontSize: 20,

  },
});
