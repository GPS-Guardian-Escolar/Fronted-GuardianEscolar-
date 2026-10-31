# Fronted-GuardianEscolar-

Este repositorio/carpeta contiene la aplicacion cliente de GPS Guardian Escolar.

## Funcion

El frontend permite que administradores, acudientes y estudiantes interactuen con el sistema. Consume la API del backend, muestra rutas, seguimiento, historial, notificaciones, perfil, autenticacion, verificacion de correo y recuperacion de cuenta.

## Componentes

- `app/(auth)`: login, registro, verificacion y recuperacion.
- `app/(tabs)`: pantallas principales del usuario autenticado.
- `components`: componentes visuales reutilizables.
- `services`: clientes HTTP y servicios de comunicacion.
- `contexts`: estado global de autenticacion y sesion.
- `config/endpoints.js`: URLs del backend, WebSocket y enlaces publicos.
- `translations`: textos de interfaz.
- `Dockerfile`: construye la version web con Expo.
- `nginx.conf.template`: plantilla Nginx para archivos estaticos, API REST y WebSocket.
- `docker/40-render-nginx-config.sh`: genera la configuracion Nginx usando `API_UPSTREAM`
  y el protocolo publico confiable del entorno.

## Ejecucion Con Expo Go

```powershell
npm install
npm run start:lan
```

La app usa las variables del archivo `.env` local de esta carpeta.

## Ejecucion En Docker Local

Para ejecutar todo el sistema, usar la infraestructura oficial:

```powershell
docker compose --env-file ..\Docker-Infra-Guardian-Escolar\.env -f ..\Docker-Infra-Guardian-Escolar\docker-compose.yaml up --build
```

El contenedor del frontend publica la app web en:

```text
http://localhost:8081/login
```

En Docker, Nginx envia `/api` y `/ws` al backend mediante `http://backend:8080`.
El frontend compila con `EXPO_PUBLIC_WEB_PROXY=true`, por lo que usa rutas relativas del
mismo origen. Para comprobar los servicios:

```powershell
docker compose ps
Invoke-WebRequest http://localhost:8081
Invoke-WebRequest http://localhost:8080/actuator/health
```

## Despliegue Docker En Render

Crear un servicio web de tipo Docker usando este repositorio y exponer el puerto `80`.
El contenedor recibe `API_UPSTREAM` en tiempo de ejecucion; no se fija el hostname del
backend dentro del codigo JavaScript.

Variables recomendadas para Render:

| Variable | Valor |
| --- | --- |
| `API_UPSTREAM` | `https://gps-guardian-escolar-backend.onrender.com` |
| `EXPO_PUBLIC_API_URL` | `/api` |
| `EXPO_PUBLIC_WS_URL` | `/ws` |
| `EXPO_PUBLIC_STUDENT_LINK_BASE_URL` | `/` |
| `EXPO_PUBLIC_WEB_PROXY` | `true` |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Clave publica restringida por dominio |

`EXPO_PUBLIC_*` se incorporan durante `npx expo export --platform web` y no deben contener
secretos. `API_UPSTREAM`, `PUBLIC_SCHEME` y `PUBLIC_PORT` solo se usan cuando inicia Nginx.
En Render, `RENDER_EXTERNAL_URL` hace que el script use `https/443`; en Docker local usa
`http/80`. `PUBLIC_SCHEME` y `PUBLIC_PORT` permiten una definicion explicita si se requiere.
El script restringe `envsubst` a esas tres variables, conservando variables nativas como
`$host`, `$uri`, `$scheme` y `$http_upgrade`.

Nginx conserva estas rutas:

- `/api/...` hacia el backend sin eliminar el prefijo `/api`.
- `/ws` hacia el endpoint STOMP con Upgrade y Connection.
- Cualquier ruta de Expo Router hacia `index.html`.

La configuracion activa SNI para un upstream HTTPS y envia los encabezados
`X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto` y `X-Forwarded-Port`. El protocolo
no se toma directamente de una cabecera externa: se deriva de `RENDER_EXTERNAL_URL` o de
`PUBLIC_SCHEME`/`PUBLIC_PORT`, evitando que una solicitud pueda declarar falsamente HTTPS.

Render termina HTTPS en su balanceador y comunica con el contenedor por HTTP. Por eso el
Nginx interno debe reenviar `X-Forwarded-Proto: https` y `X-Forwarded-Port: 443` al backend
cuando corre en Render. En local, debe reenviar `http/80`. Referencia: [Render Web
Services](https://render.com/docs/web-services) y [variables predeterminadas de
Render](https://render.com/docs/environment-variables).

Prueba local de la imagen:

```powershell
docker build -t gps-guardian-escolar-frontend:render-test .
docker run --rm -e API_UPSTREAM=https://gps-guardian-escolar-backend.onrender.com gps-guardian-escolar-frontend:render-test nginx -t
```

Para compilar la imagen web se conserva el flujo multi-stage de Node 20 y Nginx 1.27.

## Configuracion

No se debe subir un `.env` real a Git. Para desarrollo local se puede tener un `.env` ignorado por Git.

Variables principales:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_WS_URL`
- `EXPO_PUBLIC_STUDENT_LINK_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_WEB_PROXY`
- `API_UPSTREAM` (solo runtime de Nginx)
- `PUBLIC_SCHEME` (opcional, solo runtime de Nginx: `http` o `https`)
- `PUBLIC_PORT` (opcional, solo runtime de Nginx: normalmente `80` o `443`)

## Validacion

```powershell
npm run security:release
npm run lint
npx expo export --platform web
```

Los APK no se almacenan en el repositorio ni en las ramas de trabajo. Se generan con
EAS y se publican como activos de un GitHub Release. La clave de Google Maps se configura
como variable de entorno restringida por dominio o aplicación; nunca se copia a código,
`.env.example`, commits o artefactos. Si una clave apareció en una rama histórica, debe
revocarse y regenerarse desde Google Cloud aunque ya no esté en la rama actual.

El lint puede mostrar advertencias preexistentes de `utils/studentStorage.js`; deben
separarse de errores introducidos por la configuracion de Render.
