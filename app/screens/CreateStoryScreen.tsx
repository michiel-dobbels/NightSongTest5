import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';

export default function CreateStoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create a new story</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  text: { color: colors.text, fontSize: 18 },
});
