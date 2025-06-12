import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';



export default function MarketHeader() {
  return (
    <View style={styles.headerWrapper}>
      <Text style={styles.title}>Market</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.tabButton}>
          <Text style={styles.tabText}>For you</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.inactiveTab}>
          <Text style={styles.inactiveText}>Sell</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.inactiveTab}>
          <Text style={styles.inactiveText}>Categories</Text>

        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: colors.background,

    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,

  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  tabButton: {
    backgroundColor: colors.accent,

    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  inactiveTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabText: {
    color: colors.text,
    fontWeight: '600',
  },
  inactiveText: {
    color: colors.muted,

    fontWeight: '500',
  },
});
