import EncryptedStorage from 'react-native-encrypted-storage';
import * as libsignal from '@privacyresearch/libsignal-protocol-typescript';
import type { StorageType } from '@privacyresearch/libsignal-protocol-typescript';

const SESSION_PREFIX = 'session';
const IDENTITY_KEY = 'identityKey';
const REGISTRATION_ID = 'registrationId';
const SIGNED_PREKEY = 'signedPreKey';
const PREKEYS = 'preKeys';

type KeyPair = any; // You can refine this later if needed
type SignalProtocolAddress = any;

export default class SignalStore {
  identityKeyPair: KeyPair;
  registrationId: number;
  signedPreKey: KeyPair;
  preKeys: Record<number, KeyPair>;

  storeSession(address: any, record: any): Promise<void> {
    const key = `${SESSION_PREFIX}:${address.getName()}`;
    return EncryptedStorage.setItem(key, JSON.stringify(record));
  }


  constructor(
    identityKeyPair: KeyPair,
    registrationId: number,
    signedPreKey: KeyPair,
    preKeys: Record<number, KeyPair>
  ) {
    this.identityKeyPair = identityKeyPair;
    this.registrationId = registrationId;
    this.signedPreKey = signedPreKey;
    this.preKeys = {};
    Object.entries(preKeys).forEach(([keyId, key]) => {
      this.preKeys[parseInt(keyId)] = key;
    });
  }

  static async initFromStorage(): Promise<SignalStore> {
    const identityKey = JSON.parse(await EncryptedStorage.getItem(IDENTITY_KEY) || '{}');
    const registrationId = JSON.parse(await EncryptedStorage.getItem(REGISTRATION_ID) || '0');
    const signedPreKey = JSON.parse(await EncryptedStorage.getItem(SIGNED_PREKEY) || '{}');
    const preKeys = JSON.parse(await EncryptedStorage.getItem(PREKEYS) || '{}');
    return new SignalStore(identityKey, registrationId, signedPreKey, preKeys);
  }

  async saveSession(address: SignalProtocolAddress, record: any): Promise<void> {
    const key = SESSION_PREFIX + ':' + address.getName();
    await EncryptedStorage.setItem(key, JSON.stringify(record));
  }

  async loadSession(address: SignalProtocolAddress): Promise<any> {
    const key = SESSION_PREFIX + ':' + address.getName();
    const record = await EncryptedStorage.getItem(key);
    return record ? JSON.parse(record) : null;
  }

  isTrustedIdentity(): Promise<boolean> {
    return Promise.resolve(true);
  }


    // Add inside your SignalStore class
  getIdentityKeyPair(): KeyPair {
    return this.identityKeyPair;
  }

  getLocalRegistrationId(): Promise<number | undefined> {
    return Promise.resolve(this.registrationId);
  }


  saveIdentity(_identifier: string, _identityKey: any): Promise<boolean> {
    return Promise.resolve(true);
  }


  loadPreKey(encodedAddress: string | number): Promise<any> {
    const keyId = typeof encodedAddress === 'string' ? parseInt(encodedAddress) : encodedAddress;
    const key = this.preKeys[keyId];
    return Promise.resolve(key || undefined);
  }


  storePreKey(keyId: string | number, keyPair: any): Promise<void> {
    const numericKeyId = typeof keyId === 'string' ? parseInt(keyId) : keyId;
    this.preKeys[numericKeyId] = keyPair;
    return Promise.resolve();
  }


  removePreKey(keyId: string | number): Promise<void> {
    const numericKeyId = typeof keyId === 'string' ? parseInt(keyId) : keyId;
    delete this.preKeys[numericKeyId];
    return Promise.resolve();
  }


  loadSignedPreKey(keyId: string | number): Promise<any> {
    const numericKeyId = typeof keyId === 'string' ? parseInt(keyId) : keyId;
    if (this.signedPreKey?.keyId === numericKeyId) {
      return Promise.resolve(this.signedPreKey);
    }
    return Promise.resolve(undefined);
  }



  storeSignedPreKey(keyId: string | number, keyPair: any): Promise<void> {
    const numericKeyId = typeof keyId === 'string' ? parseInt(keyId) : keyId;
    this.signedPreKey = { keyId: numericKeyId, ...keyPair };
    return Promise.resolve();
  }


  removeSignedPreKey(keyId: string | number): Promise<void> {
    this.signedPreKey = null;
    return Promise.resolve();
  }


  // TODO: Implement remaining methods for SessionCipher if needed
}



