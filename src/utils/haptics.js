// Feedback tátil (vibração curtinha). No web vira no-op.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function hapticTap() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export function hapticSuccess() {
  if (Platform.OS === 'web') return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}
