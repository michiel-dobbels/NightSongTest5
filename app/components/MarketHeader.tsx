import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

export interface MarketHeaderProps {
  searchVisible: boolean;
  query: string;
  onSearchPress: () => void;
  onQueryChange: (text: string) => void;
}

export default function MarketHeader({
  searchVisible,
  query,
  onSearchPress,
  onQueryChange,
}: MarketHeaderProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (searchVisible) {
      inputRef.current?.focus();
    }
  }, [searchVisible]);

  return (
    <View style={styles.headerWrapper}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Market</Text>
        <TouchableOpacity onPress={onSearchPress} style={styles.searchButton}>
          <Ionicons
            name={searchVisible ? 'close' : 'search'}
            size={24}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      {searchVisible && (
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search listings"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      )}

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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,

  },
  searchButton: {
    padding: 4,
  },
  searchInput: {
    backgroundColor: '#333',
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
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
