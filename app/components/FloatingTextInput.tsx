import React, { useState } from 'react';
import { Modal, View, TextInput, Button, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors } from '../styles/colors';

interface Props {
  onSubmit: (text: string) => void;
  placeholder: string;
  buttonLabel?: string;
  title?: string;
}

export default function FloatingTextInput({ onSubmit, placeholder, buttonLabel = 'Post', title }: Props) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          {title && <Text style={styles.title}>{title}</Text>}
          <TextInput
            placeholder={placeholder}
            value={text}
            onChangeText={setText}
            style={styles.input}
            multiline
            autoFocus
          />
          <Button title={buttonLabel} onPress={handleSubmit} />
          <Button title="Cancel" onPress={() => setVisible(false)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#7814db',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { color: 'white', fontSize: 28, lineHeight: 30 },
  modalContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 100,
    backgroundColor: colors.background,
  },
  title: {
    color: 'white',
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
});
