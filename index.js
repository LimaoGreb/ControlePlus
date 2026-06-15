import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

// Registra o handler dos widgets Android (roda em headless JS task).
registerWidgetTaskHandler(widgetTaskHandler);

// registerRootComponent chama AppRegistry.registerComponent('main', () => App)
// e garante que o ambiente funcione tanto no Expo Go quanto no build nativo (APK).
registerRootComponent(App);
