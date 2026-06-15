import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

// Widgets só existem no APK nativo — Expo Go não tem o módulo AndroidWidget.
try {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch (_) {}

registerRootComponent(App);
