import * as libsignal from '@privacyresearch/libsignal-protocol-typescript';

export async function createSignalSessionWith(recipientId: string, recipientBundle: any, signalStore: any) {
  const address = new libsignal.SignalProtocolAddress(recipientId, 1); // device ID usually 1

  const builder = new libsignal.SessionBuilder(signalStore, address);
  await builder.processPreKey({
    registrationId: recipientBundle.registrationId,
    identityKey: recipientBundle.identityKey,
    signedPreKey: recipientBundle.signedPreKey,
    preKey: recipientBundle.preKey
  });

  console.log("✅ Session established with", recipientId);
}
