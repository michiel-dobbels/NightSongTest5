import { uploadKeyBundle } from './utils/signal/uploadKeyBundle';

await uploadKeyBundle(user.id, {
  identityKey: identityKeyPair.publicKey,
  registrationId,
  signedPreKey,
  preKeys
});
