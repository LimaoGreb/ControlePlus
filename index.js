import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent chama AppRegistry.registerComponent('main', () => App)
// e garante que o ambiente funcione tanto no Expo Go quanto no build nativo (APK).
registerRootComponent(App);
