import * as libsignal from 'libsignal';
import EncryptedStorage from 'react-native-encrypted-storage';

async function generateAndStoreSignalKeys() {
  // 1. Identity
  const identityKeyPair = await libsignal.KeyHelper.generateIdentityKeyPair();
  const registrationId = await libsignal.KeyHelper.generateRegistrationId();

  // 2. Signed pre-key
  const signedPreKeyId = 1;
  const signedPreKey = await libsignal.KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);

  // 3. Pre-keys
  const preKeys = [];
  for (let i = 1; i <= 10; i++) {
    const preKey = await libsignal.KeyHelper.generatePreKey(i + 1000); // arbitrary offset
    preKeys.push(preKey);
  }

  // 4. Store in EncryptedStorage (private keys)
  await EncryptedStorage.setItem('identityKey', JSON.stringify(identityKeyPair));
  await EncryptedStorage.setItem('registrationId', registrationId.toString());
  await EncryptedStorage.setItem('signedPreKey', JSON.stringify(signedPreKey));
  await EncryptedStorage.setItem('preKeys', JSON.stringify(preKeys));

  console.log("✅ Signal keys generated and stored locally.");

  // 5. Upload public parts to Supabase
  const publicBundle = {
    identityKey: arrayBufferToBase64(identityKeyPair.pubKey),
    registrationId,
    signedPreKey: {
      keyId: signedPreKey.keyId,
      publicKey: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
      signature: arrayBufferToBase64(signedPreKey.signature)
    },
    preKeys: preKeys.map(k => ({
      keyId: k.keyId,
      publicKey: arrayBufferToBase64(k.keyPair.pubKey)
    }))
  };

  return publicBundle;
}

// helper
function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
