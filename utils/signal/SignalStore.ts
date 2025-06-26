import EncryptedStorage from 'react-native-encrypted-storage';
import * as libsignal from '@privacyresearch/libsignal-protocol-typescript';

const SESSION_PREFIX = 'session_';
const IDENTITY_KEY = 'identityKey';
const REGISTRATION_ID = 'registrationId';
const SIGNED_PREKEY = 'signedPreKey';
const PREKEYS = 'preKeys';

export default class SignalStore {
  identityKeyPair: any;
  registrationId: number;
  signedPreKey: any;
  preKeys: Record<number, any> = {};

  constructor(identityKeyPair, registrationId, signedPreKey, preKeys) {
    this.identityKeyPair = identityKeyPair;
    this.registrationId = registrationId;
    this.signedPreKey = signedPreKey;
    preKeys.forEach(k => {
      this.preKeys[k.keyId] = k;
    });
  }

  static async initFromStorage() {
    const identityKey = JSON.parse(await EncryptedStorage.getItem(IDENTITY_KEY));
    const registrationId = parseInt(await EncryptedStorage.getItem(REGISTRATION_ID));
    const signedPreKey = JSON.parse(await EncryptedStorage.getItem(SIGNED_PREKEY));
    const preKeys = JSON.parse(await EncryptedStorage.getItem(PREKEYS));

    return new SignalStore(identityKey, registrationId, signedPreKey, preKeys);
  }

  async saveSession(address: libsignal.SignalProtocolAddress, record: any) {
    const key = SESSION_PREFIX + address.getName();
    await EncryptedStorage.setItem(key, JSON.stringify(record));
  }

  async loadSession(address: libsignal.SignalProtocolAddress) {
    const key = SESSION_PREFIX + address.getName();
    const record = await EncryptedStorage.getItem(key);
    return record ? JSON.parse(record) : null;
  }

  async isTrustedIdentity() {
    return true;
  }

  async getIdentityKeyPair() {
    return this.identityKeyPair;
  }

  getLocalRegistrationId() {
    return this.registrationId;
  }

  async loadPreKey(keyId: number) {
    return this.preKeys[keyId];
  }

  async loadSignedPreKey(keyId: number) {
    return this.signedPreKey;
  }

  async storeSession(address: libsignal.SignalProtocolAddress, record: any) {
    await this.saveSession(address, record);
  }
}

