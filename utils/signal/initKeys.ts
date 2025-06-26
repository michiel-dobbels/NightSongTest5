import initializeKeys from './initializeKeys';
import { uploadKeyBundle } from './uploadKeyBundle';

export default async function initKeys(userId: string) {
  const publicBundle = await initializeKeys();
  await uploadKeyBundle(userId, publicBundle);
}
