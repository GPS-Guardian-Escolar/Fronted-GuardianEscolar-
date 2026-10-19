import AppError from '../../../components/ui/AppError';
import { Linking, Platform } from 'react-native';

export default function PermissionGate({ message, onRetry }) {
  if (!message) return null;

  return (
    <AppError
      message={`${message} Abre Ajustes del sistema si ya negaste el permiso.`}
      onRetry={onRetry}
      onOpenSettings={Platform.OS === 'web' ? undefined : () => Linking.openSettings().catch(() => null)}
    />
  );
}
