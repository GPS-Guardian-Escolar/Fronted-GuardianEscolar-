# Vision general del proyecto

## Proposito

Guardian Escolar permite administrar estudiantes, acudientes, rutas y viajes, y ofrece seguimiento GPS, notificaciones y herramientas de cuenta. Este repositorio contiene el cliente movil y web; la API y la base de datos viven en repositorios separados.

## Arquitectura actual

- `app/`: pantallas y rutas declaradas con Expo Router.
- `contexts/`: sesion, idioma y tema compartidos por la interfaz.
- `services/`: clientes REST, autenticacion, notificaciones y WebSocket.
- `utils/`: almacenamiento, validacion, geometria de rutas y funciones compartidas.
- `features/` y `components/`: funciones y elementos de UI reutilizables.
- `translations/`: textos en espanol e ingles.

Las operaciones autenticadas usan `services/api.js`, que adjunta el JWT. El backend entrega los datos; AsyncStorage se usa para preferencias y copias locales concretas, no para simular las cuentas del servidor.

## Stack declarado

Las versiones salen de `package.json`; no se deben copiar versiones antiguas de ejemplos de Expo.

| Paquete | Version declarada | Uso |
|---|---|---|
| `expo` | `~57.0.27` | Herramientas y runtime Expo |
| `expo-router` | `~57.0.25` | Navegacion por archivos |
| `react` | `19.2.3` | UI declarativa |
| `react-native` | `0.86.3` | UI movil y multiplataforma |
| `axios` | `^1.14.0` | Cliente HTTP |
| `@stomp/stompjs` | `^7.3.0` | Eventos de seguimiento en tiempo real |
| `expo-secure-store` | `~57.0.4` | JWT en dispositivos nativos |

## Autenticacion en breve

`services/auth.service.js` usa los endpoints del backend para login, registro, verificacion de correo, recuperacion de contrasena y 2FA. `contexts/AuthContext.js` conserva el estado de la sesion durante la ejecucion. El detalle de almacenamiento y cierre de sesion esta en [Autenticacion y seguridad](./12_AUTENTICACION_Y_SEGURIDAD.md).

## Comandos habituales

```bash
npm ci
npm run start:lan
npm test
npm run lint
npx expo export --platform web
```

`npm test` ejecuta `scripts/verify-functional-fixes.cjs`. La exportacion web genera el bundle estatico que sirve Nginx en los despliegues Docker.
