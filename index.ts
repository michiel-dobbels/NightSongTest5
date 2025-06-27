import { Buffer } from 'buffer';

// Patch Buffer.from
const originalFrom = Buffer.from.bind(Buffer);
Buffer.from = function (data: any, encoding?: any) {
  if (encoding === 'utf-16le') {
    console.warn('🔥 Hermes blocked utf-16le — replacing with utf-8');
    encoding = 'utf-8';
  }
  return originalFrom(data, encoding);
} as typeof Buffer.from;


// Patch Buffer.isEncoding
const originalIsEncoding = Buffer.isEncoding.bind(Buffer);
const patchedIsEncoding: (encoding: string) => encoding is BufferEncoding = function (
  encoding
): encoding is BufferEncoding {
  if (encoding === 'utf-16le') return false;
  return originalIsEncoding(encoding);
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
