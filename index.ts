import { registerRootComponent } from 'expo';
import { Buffer } from 'buffer';
import process from 'process';

// Polyfill Buffer encoding support before importing the rest of the app
global.Buffer = Buffer;
global.process = process;

if (!Buffer.isEncoding('utf-16le')) {
  const originalFrom = Buffer.from.bind(Buffer);
  Buffer.from = ((data: any, encoding?: BufferEncoding) => {
    if (encoding === 'utf-16le') {
      encoding = 'utf16le';
    }
    // @ts-ignore - BufferEncoding may not include utf-16le
    return originalFrom(data, encoding as any);
  }) as typeof Buffer.from;

  const originalIsEncoding = Buffer.isEncoding.bind(Buffer);
  Buffer.isEncoding = ((encoding: string) => {
    return encoding === 'utf-16le' ? true : originalIsEncoding(encoding);
  }) as typeof Buffer.isEncoding;
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
