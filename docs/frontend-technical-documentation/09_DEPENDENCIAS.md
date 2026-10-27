# Dependencias

Las versiones de esta tabla reflejan el `package.json` actual. El rango es el que declara el repositorio; `package-lock.json` fija la resolucion instalada. Si se actualiza el manifiesto, actualiza tambien este documento.

| Paquete | Rango declarado | Uso |
|---|---|---|
| `expo` | `~57.0.27` | Runtime y comandos de desarrollo |
| `expo-router` | `~57.0.25` | Navegacion basada en archivos |
| `react` | `19.2.3` | Renderizado de componentes |
| `react-native` | `0.86.3` | Interfaz nativa |
| `react-native-web` | `^0.21.0` | Ejecucion en navegador |
| `axios` | `^1.14.0` | Peticiones REST |
| `@stomp/stompjs` | `^7.3.0` | WebSocket/STOMP |
| `sockjs-client` | `^1.6.1` | Transporte alternativo para STOMP |
| `@react-native-async-storage/async-storage` | `2.2.0` | Preferencias y datos locales |
| `expo-secure-store` | `~57.0.4` | Almacenamiento cifrado del token nativo |
| `expo-location` | `~57.0.20` | Ubicacion del dispositivo |
| `expo-notifications` | `~57.0.22` | Registro y recepcion de notificaciones |
| `react-native-maps` | `1.27.2` | Mapas en iOS y Android |
| `react-native-paper` | `5.15.0` | Componentes Material |
| `react-native-reanimated` | `4.5.1` | Animaciones |
| `typescript` | `~6.0.3` | Herramientas de desarrollo y tipado |
| `eslint` | `^9.0.0` | Analisis estatico |

## Almacenamiento de autenticacion

El JWT se guarda con SecureStore en Android e iOS. En web se mantiene en memoria del modulo `utils/storage.js`; no se escribe en localStorage, sessionStorage ni AsyncStorage. Por eso una recarga del navegador requiere iniciar sesion de nuevo. La memoria del navegador no protege contra codigo malicioso que ya se este ejecutando en la pagina.

AsyncStorage se usa para preferencias y datos locales no equivalentes al token de autenticacion.

## Actualizacion

Usa `npm ci` para instalar exactamente el lockfile. Despues de actualizar una dependencia, valida la compatibilidad Expo y actualiza `package-lock.json` en el mismo cambio.
