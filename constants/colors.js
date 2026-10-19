import { lightColors } from '../theme/tokens';

// Capa legacy de compatibilidad. Las pantallas nuevas deben usar useTheme()
// y tokens directamente; estos alias evitan romper pantallas pendientes de migrar.
export const COLORS = {
  FONDO_PRINCIPAL: lightColors.background,
  PRIMARIO: lightColors.primary,
  ACENTO: '#7BC74D',

  FONDO_TARJETA: lightColors.surface,
  FONDO_INPUT: '#F8F9FA',
  FONDO_HEADER: lightColors.primary,

  TEXTO_GENERAL: lightColors.onSurface,
  TEXTO_CONTRASTE: lightColors.onPrimary,
  TEXTO_SECUNDARIO: lightColors.muted,
  TEXTO_AZUL: lightColors.primary,

  PRIMARIO_OSCURO: '#133A66',
  PRIMARIO_SUAVE: '#2A6CB5',
  PRIMARIO_CLARO: '#E8EFF7',

  ACENTO_OSCURO: '#5C9E37',
  ACENTO_CLARO: '#F1F9EE',

  ALERTA: lightColors.error,
  ALERTA_CLARO: '#FFEBEE',
  ADVERTENCIA: '#F59E0B',
  ESTADO_OK: '#7BC74D',
  ESTADO_ALERTA: lightColors.error,

  BLANCO: lightColors.surface,
  NEGRO: '#000000',
  GRIS_BORDE: lightColors.border,
  TRAYECTO_RECORRIDO: lightColors.primary,

  AZUL_FONDO: lightColors.background,
  AZUL_BOTON: lightColors.primary,
  AZUL_LOGO: lightColors.primary,
  GRIS_TARJETA: lightColors.surface,
  GRIS_INPUT: '#F8F9FA',
};
