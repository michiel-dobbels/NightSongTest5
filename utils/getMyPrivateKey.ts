import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getMyPrivateKey(): Promise<string> {
  const key = await AsyncStorage.getItem('identity_private_key');
  if (!key) throw new Error('Private key not found');
  return key;
}
