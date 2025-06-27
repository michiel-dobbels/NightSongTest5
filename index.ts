// Patch Buffer to avoid Hermes crashes on utf‑16 requests
import './utils/bufferShim';
import './utils/textEncodingPolyfill';




import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
