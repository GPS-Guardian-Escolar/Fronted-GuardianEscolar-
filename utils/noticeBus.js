const listeners = new Set();

import { Alert, Platform } from 'react-native';

export function subscribeNotice(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitNotice(title, message, options = {}) {
  listeners.forEach(listener => listener({
    title,
    message,
    tone: options.tone || 'info',
    duration: options.duration || 4500,
  }));
}

export function showPlatformNotice(title, message, options = {}) {
  if (Platform.OS === 'web') {
    emitNotice(title, message, options);
    return;
  }
  Alert.alert(title, message);
}

export function showPlatformConfirm(title, message, buttons = []) {
  if (Platform.OS === 'web') {
    const cancel = buttons.find(button => button.style === 'cancel') || buttons[0];
    const confirm = buttons.find(button => button.style !== 'cancel') || buttons[buttons.length - 1];
    emitNotice('__confirm__', { title, message, cancel, confirm });
    return;
  }
  Alert.alert(title, message, buttons);
}
