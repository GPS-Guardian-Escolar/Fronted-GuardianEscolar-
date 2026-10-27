# Flujo de datos y estado

## Datos del servidor

Las pantallas llaman servicios de `services/` y no acceden directamente a Axios. `services/api.js` configura la URL base, adjunta el JWT a llamadas privadas y centraliza la reaccion a respuestas 401. Los servicios adaptan las respuestas de Spring Boot a los modelos que usa la UI.

```text
Pantalla o hook -> servicio del dominio -> services/api.js -> API Spring Boot
```

La informacion del servidor se vuelve a consultar cuando la pantalla o el flujo de negocio lo requiere. No todos los modulos usan una unica estrategia de cache; consulta el servicio correspondiente antes de asumir que AsyncStorage es la fuente principal.

## Flujo de autenticacion

```text
Login -> POST /auth/login -> respuesta del backend
                         -> 2FA requerido: verificar codigo y completar login
                         -> token: guardar segun plataforma y actualizar AuthContext
Peticion privada -> interceptor Axios -> Authorization: Bearer <token>
Logout -> POST /auth/logout -> limpiar estado y almacenamiento local
```

Los endpoints de autenticacion se implementan en `services/auth.service.js`. No hay un generador local de cuentas ni de tokens mock. El token nativo va a SecureStore; el token web vive solo en memoria. El perfil y preferencias no secretas pueden persistir con AsyncStorage.

## Estado de interfaz

`contexts/AuthContext.js`, `contexts/LanguageContext.js` y `contexts/ThemeContext.js` comparten el estado necesario entre pantallas. Los hooks encapsulan flujos de funciones especificas, como la suscripcion de seguimiento en tiempo real. Mantener el estado de pantalla en el componente cuando no necesita compartirse evita acoplar modulos.

## Seguimiento en tiempo real

El seguimiento usa el cliente STOMP de `services/socket.js` y la API de coordenadas del backend. Los callbacks actualizan el estado de mapa; la interfaz no debe tratar el estado visual como almacenamiento historico permanente. Las coordenadas pendientes en dispositivo, cuando existan, pertenecen a las utilidades de tracking y tienen un ciclo independiente de la sesion del usuario.

## Estado local y persistencia

- `utils/storage.js`: JWT segun plataforma, perfil no sensible y correo recordado.
- `contexts/LanguageContext.js` y `contexts/ThemeContext.js`: preferencias locales.
- `utils/studentStorage.js`: almacenamiento local empleado por algunas vistas y flujos concretos.
- AsyncStorage no es almacenamiento seguro para JWT; en web no se usa para el token.

Al agregar una persistencia, indica si representa cache, preferencia o fuente de verdad. Evita combinar datos de demostracion con respuestas del backend sin identificarlos en la interfaz.

## Recuperacion ante errores

Los servicios convierten errores de Axios en mensajes que la UI puede presentar. Una respuesta 401 provoca la limpieza de la sesion y notifica a AuthContext. Los errores de red deben conservarse como errores recuperables; no se deben reemplazar silenciosamente por datos ficticios.
