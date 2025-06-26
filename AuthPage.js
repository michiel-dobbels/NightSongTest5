import React, { useState } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { colors } from './app/styles/colors';

import { useAuth } from './AuthContext';
import { useNavigation } from '@react-navigation/native';


function AuthPage() {
  const navigation = useNavigation();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const { signUp, signIn } = useAuth();

  const handleSubmit = async () => {
  setError(null);

    if (
      !email ||
      !password ||
      (mode === 'signup' && (!username || !name || !passwordConfirm))

    ) {
      setError('Please fill in all fields');
      return;
    }

    try {
      if (mode === 'signup') {
        if (password !== passwordConfirm) {
          throw new Error('Passwords do not match');
        }

        const { error } = await signUp(email, password, username, name);
        if (error) throw error;
        Alert.alert('Check your email', 'Confirm your account to finish signing up.');

        Alert.alert(
          'Sign Up',
          'Check your email to confirm your account before logging in.'
        );

      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }

      // Navigator will switch to the Tabs stack once the user state updates
    } catch (err) {
      setError(err.message);
    }
  };



  return (
    <View style={styles.container}>
      <Text style={styles.slogan}>No Song so Sweet</Text>
      <Text style={styles.title}>{mode === 'login' ? 'Login' : 'Sign Up'}</Text>

      {mode === 'signup' && (
        <>
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
          />
          <TextInput
            placeholder="Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        </>
      )}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      {mode === 'signup' && (
        <TextInput
          placeholder="Confirm Password"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          style={styles.input}
          secureTextEntry
        />
      )}

      <Button title={mode === 'login' ? 'Login' : 'Sign Up'} onPress={handleSubmit} />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        <Text style={styles.toggle}>
          {mode === 'login'
            ? 'Need an account? Sign Up'
            : 'Already have an account? Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default AuthPage;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 80,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    textAlign: 'center',
    color: colors.text,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#aaa',
    marginBottom: 12,
    borderRadius: 5,
    color: colors.text,
    backgroundColor: colors.background,
  },
  error: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  toggle: {
    marginTop: 20,
    textAlign: 'center',
    color: colors.accent,
  },
  slogan: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Snell Roundhand', default: 'cursive' }),
    textAlign: 'center',
    color: colors.accent,
    marginBottom: 10,
  },
});
