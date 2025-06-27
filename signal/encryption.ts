import * as libsignal from '@privacyresearch/libsignal-protocol';
import { supabase } from '../lib/supabase';
import SignalStore from '../utils/signal/SignalStore';
import { fetchKeyBundleForUser } from '../utils/signal/fetchKeyBundle';
import { createSignalSessionWith } from '../utils/signal/createSession';
import { encryptMessageTo } from '../utils/signal/encryptMessage';

export async function encryptSignalMessage({ toUserId, plaintext }: { toUserId: string; plaintext: string }) {
  const store = await SignalStore.initFromStorage();
  const address = new libsignal.SignalProtocolAddress(toUserId, 1);
  const existing = await store.loadSession(address);
  if (!existing) {
    const bundle = await fetchKeyBundleForUser(toUserId);
    if (!bundle) throw new Error('No key bundle for recipient');
    await createSignalSessionWith(toUserId, bundle, store);
    // remove used prekey from Supabase
    const { data: row } = await supabase
      .from('signal_key_bundles')
      .select('prekeys')
      .eq('user_id', toUserId)
      .single();
    if (row?.prekeys?.length) {
      const remaining = row.prekeys.slice(1);
      await supabase.from('signal_key_bundles').update({ prekeys: remaining }).eq('user_id', toUserId);
    }
  }

  const encrypted = await encryptMessageTo(toUserId, plaintext, store);
  return { base64Ciphertext: encrypted.body, type: encrypted.type };
}
