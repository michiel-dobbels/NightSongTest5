import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript';
import { Buffer } from 'buffer';

export interface SignalIdentity {
  identityKeyPair: KeyPair;
  registrationId: number;
}

export interface KeyPair {
  pubKey: ArrayBuffer;
  privKey: ArrayBuffer;
}

export const generateSignalIdentity = async (): Promise<SignalIdentity> => {
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
  const registrationId = await KeyHelper.generateRegistrationId();
  return { identityKeyPair, registrationId };
};

export const encodeKey = (buf: ArrayBuffer): string =>
  Buffer.from(new Uint8Array(buf)).toString('base64');
