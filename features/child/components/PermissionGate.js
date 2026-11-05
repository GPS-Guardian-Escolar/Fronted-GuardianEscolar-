import AppError from '../../../components/ui/AppError';
import { Linking, Platform } from 'react-native';

export default function PermissionGate({ message, onRetry }) {
  if (!message) return null;
  const needsSettings = /permiso|ubicaci[oó]n|gps|location|permission|geolocation/i.test(message);

  return (
    <AppError
      message={message}
      onRetry={onRetry}
      onOpenSettings={needsSettings && Platform.OS !== 'web' ? () => Linking.openSettings().catch(() => null) : undefined}
    />
  );
}
