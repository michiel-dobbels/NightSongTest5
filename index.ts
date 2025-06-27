import { Buffer } from 'buffer';

// Patch Buffer.from early so libraries can't request unsupported encodings
const originalFrom = Buffer.from.bind(Buffer);
Buffer.from = function (data: any, encoding?: any) {
  const enc = typeof encoding === 'string' ? encoding.toLowerCase() : encoding;
  if (enc === 'utf-16le' || enc === 'utf16le' || enc === 'ucs2') {
    console.warn('🔥 Hermes blocked utf-16le — replacing with utf-8');
    encoding = 'utf-8';
  }
  return originalFrom(data, encoding);
} as typeof Buffer.from;

// Patch Buffer.isEncoding to advertise lack of utf‑16le support
const originalIsEncoding = Buffer.isEncoding.bind(Buffer);
const patchedIsEncoding: (encoding: string) => encoding is BufferEncoding = (
  encoding,
): encoding is BufferEncoding => {
  const enc = encoding?.toLowerCase?.();
  if (enc === 'utf-16le' || enc === 'utf16le' || enc === 'ucs2') return false;
  return originalIsEncoding(encoding as BufferEncoding);
};

Buffer.isEncoding = patchedIsEncoding;

// Make Buffer global
global.Buffer = Buffer;



import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
