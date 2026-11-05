# ⚙️ Carpetas del Sistema — `constants/`, `contexts/`, `hooks/`, `services/`, `utils/`, `translations/`
## GPS Guardian Escolar

> Estas carpetas contienen la **lógica del sistema**: configuraciones, estado global, funciones reutilizables y comunicación con el servidor. No son pantallas ni componentes visuales, sino la "inteligencia" detrás de la app.

---

## 📁 `constants/` — Valores Constantes

> Valores que **no cambian nunca** en la app y que se usan en muchos lugares.

```
constants/
└── colors.js    ← Paleta oficial de colores
```

### `colors.js`
**¿Qué hace?**
Exporta el objeto `COLORS` con todos los colores oficiales de la marca Guardian Escolar. En lugar de escribir `#1A4F8A` en cada archivo, se importa `COLORS.PRIMARIO`.

**Beneficio:** Si alguna vez se necesita cambiar un color, solo se cambia aquí y se actualiza en **toda la app** automáticamente.

**Colores principales:**
- `PRIMARIO` = `#1A4F8A` — Azul Medianoche (marca principal)
- `ACENTO` = `#7BC74D` — Verde Lima (detalles y acentos)
- `FONDO_PRINCIPAL` = `#F4F5F7` — Gris claro (fondo de pantallas)
- `ALERTA` = `#E53935` — Rojo (alertas y errores)

*(Ver documentación completa de colores en `05_COLORES_Y_FUNCIONALIDADES.md`)*

---

## 📁 `contexts/` — Estado Global (React Context)

> Los contextos permiten compartir información entre **todas las pantallas** sin necesidad de pasar datos de pantalla en pantalla manualmente (conocido como "prop drilling").

```
contexts/
├── AuthContext.js      ← Sesión del usuario autenticado
├── LanguageContext.js  ← Idioma activo (ES/EN)
├── TrackingContext.js  ← Estado del rastreo GPS en tiempo real
└── UserRoleContext.js  ← Rol del usuario (padre, admin, etc.)
```

---

### `AuthContext.js`
**¿Qué hace?**
Almacena y provee en toda la app la información del usuario que inició sesión:
- Token de autenticación (JWT).
- Datos del perfil (nombre, email).
- Estado de autenticación (si está logueado o no).
- Función para cerrar sesión.

**¿Dónde se usa?**
En `app/_layout.js` para decidir si mostrar las pantallas de auth o las tabs principales. También en `profile.js` para mostrar los datos del usuario.

---

### `LanguageContext.js`
**¿Qué hace?**
Gestiona el **idioma activo** de la aplicación. Expone:
- `lang`: el código del idioma actual (`'es'` o `'en'`).
- `setLanguage(code)`: función para cambiar de idioma.
- `t(key)`: función de traducción que busca el texto correcto en el diccionario de `translations/index.js`.

**¿Dónde se usa?**
En **TODAS** las pantallas. Cada texto visible en la app pasa por `t('clave')` para que sea bilingüe.

---

### `TrackingContext.js`
**¿Qué hace?**
Mantiene el estado del rastreo GPS en tiempo real. Almacena las coordenadas recibidas del backend vía WebSocket y las distribuye a los componentes del mapa y los paneles de seguimiento.

**Estado futuro:** Está preparado para recibir actualizaciones en vivo del backend una vez que la integración con el servidor GPS esté completa.

---

### `UserRoleContext.js`
**¿Qué hace?**
Almacena el **rol del usuario** autenticado. Permite que diferentes roles (padre/acudiente, administrador escolar) vean diferentes funcionalidades o secciones dentro de la misma app.

---

## 📁 `hooks/` — Custom Hooks de React

> Los hooks son funciones especiales de React que encapsulan lógica compleja y la hacen **reutilizable** entre componentes. Comienzan siempre con la palabra `use`.

```
hooks/
├── useApi.js            ← Peticiones HTTP genéricas
├── useAuth.js           ← Lógica de sesión
├── useLocation.js       ← GPS y ubicación del dispositivo
├── useNotifications.js  ← Gestión de alertas push
└── useTracking.js       ← Rastreo en tiempo real
```

---

### `useAuth.js`
**¿Qué hace?**
Encapsula toda la lógica de autenticación:
- Función `login(email, password)`: llama a `auth.service.js` y guarda el token.
- Función `logout()`: limpia el token y redirige a welcome.
- Función `register(data)`: crea una nueva cuenta.
- Estado `isLoading` para mostrar el spinner durante las peticiones.

**Se usa en:** `login.js`, `register.js`, `profile.js`

---

### `useApi.js`
**¿Qué hace?**
Hook genérico para hacer peticiones HTTP. Maneja automáticamente:
- Estado de carga (`isLoading`).
- Errores de red (`error`).
- Datos recibidos (`data`).

Evita repetir el mismo bloque `try/catch` en cada pantalla.

---

### `useLocation.js`
**¿Qué hace?**
Accede al **GPS del dispositivo** usando `expo-location`. Solicita el permiso al usuario, obtiene la ubicación actual y puede hacer seguimiento continuo de la posición.

**Se usa en:** `tracking.js` para mostrar la ubicación del padre en el mapa.

---

### `useNotifications.js`
**¿Qué hace?**
Configura el sistema de **notificaciones push** usando `expo-notifications`. Registra el dispositivo para recibir alertas aunque la app esté en segundo plano.

**Se usa en:** Al iniciar sesión para registrar el token del dispositivo en el servidor.

---

### `useTracking.js`
**¿Qué hace?**
Gestiona la conexión WebSocket con el backend para recibir actualizaciones de ubicación del estudiante en tiempo real. Usa STOMP.js para conectarse al canal del estudiante.

---

## 📁 `services/` — Comunicación con el Backend

> Los servicios son el puente entre la app y el servidor. Contienen todas las **peticiones HTTP y WebSocket** al backend de Guardian Escolar.

```
services/
├── api.js                   ← Configuración base de Axios (URL del servidor)
├── auth.service.js          ← Login, registro, recuperación de contraseña
├── auth/                    ← Sub-módulo reservado
├── notification.service.js  ← Obtener y gestionar notificaciones del servidor
├── route.service.js         ← Gestión de rutas GPS
├── shared/                  ← Servicios compartidos (futuro)
├── socket.js                ← Configuración de la conexión WebSocket
├── student.service.js       ← CRUD de estudiantes en el servidor
├── students/                ← Sub-módulo reservado
├── tracking/                ← Sub-módulo reservado
└── tracking.service.js      ← Obtener posiciones GPS del servidor
```

---

### `api.js`
**¿Qué hace?**
Crea y exporta una instancia de **Axios** pre-configurada con:
- La URL base del backend (leída desde `.env`).
- Headers comunes (Content-Type: JSON).
- Interceptores que automáticamente adjuntan el token JWT a cada petición.

**Todos los demás servicios importan esta instancia.**

---

### `auth.service.js`
**¿Qué hace?**
Contiene todas las funciones relacionadas con autenticación:
- `login(email, password)` → POST `/auth/login`
- `register(userData)` → POST `/auth/register`
- `forgotPassword(email)` → POST `/auth/forgot-password`
- `verifyCode(code)` → POST `/auth/verify-code`
- `resetPassword(newPass)` → POST `/auth/reset-password`

---

### `student.service.js`
**¿Qué hace?**
CRUD completo de estudiantes contra el servidor:
- `getStudents()` → GET `/students`
- `createStudent(data)` → POST `/students`
- `updateStudent(id, data)` → PUT `/students/:id`
- `deleteStudent(id)` → DELETE `/students/:id`

---

### `tracking.service.js`
**¿Qué hace?**
Obtiene las posiciones GPS registradas del estudiante:
- `getCurrentLocation(studentId)` → GET `/tracking/:studentId/current`
- `getTrackingHistory(studentId)` → GET `/tracking/:studentId/history`

---

### `socket.js`
**¿Qué hace?**
Configura la conexión **WebSocket** con el backend usando la librería STOMP.js. Los WebSockets permiten recibir datos en tiempo real sin tener que consultar al servidor repetidamente (como un walkie-talkie vs hacer una llamada cada segundo).

---

### `notification.service.js`
**¿Qué hace?**
Gestiona las notificaciones del servidor:
- Obtener notificaciones pendientes.
- Marcar notificaciones como leídas.
- Registrar el token del dispositivo para notificaciones push.

---

### `route.service.js`
**¿Qué hace?**
Gestiona las rutas GPS guardadas:
- Obtener las rutas asignadas a un estudiante.
- Crear y editar rutas de trayecto.

---

## 📁 `translations/` — Sistema de Traducción

> Contiene el diccionario de textos en todos los idiomas disponibles.

```
translations/
└── index.js    ← Diccionario completo ES/EN
```

### `index.js`
**¿Qué hace?**
Exporta el objeto `translations` con dos secciones principales:
- `es`: todos los textos en **Español**.
- `en`: todos los textos en **Inglés**.

Cada texto tiene una **clave única** que se usa en las pantallas con la función `t('clave')`. Ejemplo:
```javascript
t('histTitle')
// → Español: "Historial de Trayectos"
// → Inglés:  "Journey History"
```

También exporta `SUPPORTED_LANGUAGES` con los idiomas disponibles y los que están "próximamente" (Francés, Portugués).

---

## 📁 `utils/` — Funciones de Utilidad

> Funciones puras (sin estado, sin componentes) que realizan tareas específicas y se pueden usar en cualquier parte del proyecto.

```
utils/
├── calculateDistance.js    ← Distancia entre coordenadas GPS
├── formatDate.js           ← Formateo de fechas y horas
├── storage.js              ← AsyncStorage genérico
├── studentStorage.js       ← Almacenamiento específico de la app
└── validators.js           ← Validaciones de formularios
```

---

### `studentStorage.js` ⭐ (Más Importante)
**¿Qué hace?**
Es la librería de almacenamiento local de la app. Guarda datos en el dispositivo usando `AsyncStorage` (como una mini base de datos local que no requiere internet).

**Funciones exportadas:**
- `getStudents()` — Lee la lista de estudiantes guardada localmente.
- `saveStudents(data)` — Guarda/actualiza la lista de estudiantes.
- `deleteStudent(id)` — Elimina un estudiante y **todos sus datos** asociados (historial + notificaciones).
- `getNotifications()` — Lee las notificaciones guardadas.
- `addNotification(notif)` — Agrega una nueva notificación.
- `deleteNotification(id)` — Elimina una notificación específica.
- `getHistory()` — Lee el historial de trayectos.
- `addHistory(entry)` — Agrega un nuevo registro al historial.
- `deleteHistory(id)` — Elimina un registro específico del historial.

**Claves de AsyncStorage usadas:**
- `@guardian_estudiantes` — Lista de estudiantes.
- `@guardian_notificaciones` — Lista de notificaciones.
- `@guardian_historial` — Historial de trayectos.

---

### `storage.js`
**¿Qué hace?**
Funciones genéricas de AsyncStorage:
- `saveData(key, value)` — Guarda cualquier dato con una clave.
- `getData(key)` — Lee un dato por su clave.
- `removeData(key)` — Elimina un dato.

Se usa para guardar el token de sesión, preferencias de idioma, etc.

---

### `calculateDistance.js`
**¿Qué hace?**
Implementa la **fórmula de Haversine** para calcular la distancia en kilómetros entre dos puntos geográficos (latitud/longitud). Se usa para saber si el estudiante está dentro o fuera de la zona segura.

---

### `formatDate.js`
**¿Qué hace?**
Funciones para formatear fechas y horas de forma amigable:
- Convertir timestamp a "Hoy a las 3:45 PM".
- Formatear duración en minutos/horas.
- Mostrar "Hace 5 minutos" en lugar de la hora exacta.

---

### `validators.js`
**¿Qué hace?**
Funciones de validación para los formularios:
- `isValidEmail(email)` — Verifica el formato del correo.
- `isValidPassword(password)` — Verifica que la contraseña cumpla los requisitos mínimos.
- `isNotEmpty(value)` — Verifica que un campo no esté vacío.

---

## 📁 `assets/` — Recursos Estáticos

```
assets/
├── expo.icon/          ← Íconos adaptativos para Android/iOS
└── images/
    ├── icon.png            ← Ícono principal de la app
    ├── logo.png            ← Logo de Guardian Escolar
    ├── logo-glow.png       ← Logo con efecto de brillo (pantalla de bienvenida)
    ├── favicon.png         ← Ícono para la versión web
    ├── splash-icon.png     ← Ícono de la pantalla de carga inicial
    ├── android-icon-*.png  ← Íconos adaptativos de Android
    └── tutorial-web.png    ← Imagen del tutorial web
```
