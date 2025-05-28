import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      {profile && (
        <>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.display_name && (
            <Text style={styles.name}>{profile.display_name}</Text>
          )}
        </>
      )}
      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#061e45',
  },
  username: {
    color: 'white',
    fontSize: 24,
    marginBottom: 10,
  },
  name: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
});
