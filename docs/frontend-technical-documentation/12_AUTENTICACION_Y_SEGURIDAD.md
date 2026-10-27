# Autenticacion y seguridad

## Flujo vigente

La autenticacion es contra el backend Spring Boot; no se crean cuentas ni JWT simulados en el cliente. `services/auth.service.js` consume los endpoints de autenticacion y normaliza las respuestas. `contexts/AuthContext.js` mantiene usuario, token y estado de carga.

1. Login envia correo, contrasena e informacion del dispositivo a la API.
2. Si el servidor requiere 2FA, la app solicita y verifica el codigo antes de guardar la sesion.
3. El cliente guarda el JWT y el perfil, y las llamadas privadas envian `Authorization: Bearer <token>`.
4. Al iniciar, el cliente restaura el token segun la plataforma y consulta el perfil actual al servidor.
5. Al cerrar sesion, envia `POST /auth/logout` para revocar la sesion del backend y luego limpia el estado local.

La API y la URL base se configuran en `config/endpoints.js`. Los errores 401 limpian la sesion y notifican a `AuthContext`.

## Almacenamiento por plataforma

| Plataforma | Token | Perfil y preferencias |
|---|---|---|
| Android/iOS | `expo-secure-store` (Keychain/Keystore del sistema) | AsyncStorage para el perfil y preferencias no secretas |
| Web | Memoria del modulo `utils/storage.js` | AsyncStorage para datos no sensibles |

En navegador no se guarda el JWT en `localStorage`, `sessionStorage` ni AsyncStorage. La memoria se pierde al recargar o cerrar la pestana; por ello se vuelve a iniciar sesion. Este almacenamiento reduce la persistencia del token, pero un XSS activo aun puede actuar sobre la sesion mientras la pagina esta abierta.

Los tokens antiguos que estuvieran en `sessionStorage` se eliminan al cargar `utils/storage.js`.

## Cierre de sesion

`authService.logout()` intenta revocar la sesion en el servidor y siempre limpia el token y el perfil localmente. Si no hay red, el cliente finaliza su estado local aunque la revocacion remota no haya podido confirmarse. El backend debe validar la autorizacion de cada endpoint; las rutas ocultas en la interfaz no son un control de acceso.

## Variables de entorno

Las URLs publicas se definen con `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL` y `EXPO_PUBLIC_STUDENT_LINK_BASE_URL`. Las variables `EXPO_PUBLIC_*` se incorporan al bundle del cliente y no deben contener secretos privados.
