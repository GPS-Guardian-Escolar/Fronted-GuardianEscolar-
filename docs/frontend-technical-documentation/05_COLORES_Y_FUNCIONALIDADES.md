# Sistema visual y funcionalidades verificadas

GPS Guardian Escolar usa una jerarquía visual común para que las pantallas de Hijos y Seguimiento presenten tarjetas, espaciado, etiquetas e iniciales de manera consistente. Esta guía documenta los tokens visuales actuales; no certifica capacidad, precisión GPS ni entrega de notificaciones externas.

## Colores semánticos

Los estados principales son azul para información, verde para éxito y rojo para errores o alertas. Los fondos, superficies, bordes y textos usan colores neutros. En tema oscuro se usan variantes con contraste suficiente; los tokens están centralizados en `theme/tokens.js`, `theme/colors.js`, `theme/lightTheme.js` y `theme/darkTheme.js`.

| Función | Tema claro | Tema oscuro |
| --- | --- | --- |
| Azul primario e información | `#1A4F8A` | `#9CCBFF` |
| Verde de éxito | `#7BC74D` | `#9EE361` |
| Rojo de error o alerta | `#B42318` | `#FFB4AB` |

Las iniciales del estudiante usan siempre el color primario de marca dentro de una misma sesión visual; su fondo no cambia según el estado del trayecto. El estado se comunica con una etiqueta o indicador semántico adicional.

## Espaciado y componentes

La escala compartida de espaciado se define en `theme/tokens.js` (4, 8, 16, 24, 32 y 48 px). Los radios comunes son 6, 10 y 16 px. Las tarjetas principales de Hijos y Seguimiento mantienen la misma familia de bordes, separación y superficie; los controles interactivos conservan un área de toque accesible.

## Alcance del seguimiento

La pantalla identifica una ubicación atrasada cuando hay un trayecto activo sin nuevos puntos GPS durante más de dos minutos y muestra la hora del último punto recibido cuando existe. La ausencia de puntos no permite asegurar si la causa es internet, GPS, permisos, batería o una pausa del rastreo.

El mapa conecta las coordenadas que el celular envía y filtra algunos saltos improbables. Los segmentos rectos entre muestras no representan cada giro exacto; la precisión depende del GPS, la frecuencia de envío, la conectividad y los permisos del teléfono. La aplicación no debe anunciar ese dibujo como navegación giro a giro.

Ver [alcance del seguimiento, retención y políticas pendientes](tracking-scope-and-data-policy.md) para los límites observados, los plazos de datos que aún deben aprobarse, la capacidad que aún no tiene prueba de carga y las referencias de protección de datos de menores.

## Verificación

Los tokens y componentes se pueden contrastar con el código indicado arriba. La prueba funcional del frontend cubre validaciones, QR, autenticación del estudiante, cola GPS, traducciones, historial y geometría de rutas; una prueba automatizada no reemplaza una prueba GPS con celulares reales ni una medición de carga en el entorno desplegado.
