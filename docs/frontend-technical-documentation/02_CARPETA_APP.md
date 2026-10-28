# 📱 Carpeta `app/` — Pantallas Principales
## GPS Guardian Escolar

> Esta carpeta contiene **todas las pantallas** de la aplicación, organizadas siguiendo el sistema de rutas de **Expo Router** (navegación basada en el nombre del archivo).

---

## ¿Qué es Expo Router?

Expo Router funciona como las carpetas de un sitio web: el nombre del archivo se convierte en la URL/ruta de navegación automáticamente. No hace falta definir rutas manualmente.

```
app/
├── (auth)/        → Rutas de autenticación (NO requieren login)
├── (tabs)/        → Rutas del menú principal (SÍ requieren login)
├── _layout.js     → Configuración raíz de toda la app
└── student-dashboard.js → Pantalla especial del panel del estudiante
```

---

## 📄 Archivos en la raíz de `app/`

---

### `_layout.js`
**¿Qué hace?**
Es el archivo más importante de toda la aplicación. Se ejecuta **primero** cada vez que la app abre. Su función es:
1. Envolver toda la app con los `Providers` globales (`AuthContext`, `LanguageContext`, `UserRoleContext`).
2. Decidir si el usuario va al flujo de **autenticación** (`(auth)/`) o a las **pantallas principales** (`(tabs)/`).
3. Configurar la barra de estado del sistema operativo.

**Sin este archivo, la app no funciona.**

---

### `student-dashboard.js`
**¿Qué hace?**
Pantalla especial que muestra el panel de control desde el **punto de vista del estudiante** (no del padre/acudiente). Muestra el estado del trayecto activo, la ruta asignada y la zona segura actual.

---

## 📁 Subcarpeta `(auth)/` — Flujo de Autenticación

> Las pantallas dentro de los paréntesis `(auth)` son un **grupo de rutas**. El nombre entre paréntesis **no aparece en la URL**, solo agrupa lógicamente las pantallas.

```
(auth)/
├── _layout.js          → Configura la navegación dentro del grupo auth
├── welcome.js          → Pantalla de bienvenida (primera vez)
├── info.js             → Pantalla informativa del proyecto
├── login.js            → Inicio de sesión
├── register.js         → Registro de nuevo acudiente
├── forgot-password.js  → Solicitud de recuperación de contraseña
├── verify-code.js      → Ingreso del código de verificación por email
└── reset-password.js   → Creación de nueva contraseña
```

---

### `_layout.js` (auth)
**¿Qué hace?**
Define la pila de navegación (Stack Navigator) para el flujo de autenticación. Oculta el header nativo y permite las animaciones de transición entre pantallas de login.

---

### `welcome.js`
**¿Qué hace?**
Primera pantalla que ve el usuario al instalar la app. Muestra el logo de **GPS Guardian Escolar**, el eslogan del proyecto y dos botones: "Iniciar Sesión" y "Registrarse".

**Navegación:**
- → `login.js`
- → `register.js`
- → `info.js`

---

### `info.js`
**¿Qué hace?**
Pantalla informativa que explica brevemente qué es Guardian Escolar y cómo funciona el sistema de seguimiento. Ideal para usuarios nuevos que quieren saber más antes de registrarse.

**Navegación:**
- ← Volver a `welcome.js`

---

### `login.js`
**¿Qué hace?**
Formulario de inicio de sesión. Solicita correo electrónico y contraseña. Consume el servicio `auth.service.js` para autenticarse contra el backend. Si el login es exitoso, redirige al menú principal `(tabs)/`.

**Campos del formulario:**
- 📧 Correo electrónico
- 🔒 Contraseña
- ☑️ Recordarme

**Navegación:**
- → `(tabs)/` si login exitoso
- → `forgot-password.js` si olvidó contraseña
- → `register.js` si no tiene cuenta
- ← Volver a `welcome.js`

---

### `register.js`
**¿Qué hace?**
Formulario de registro para nuevos acudientes/padres. Crea una cuenta en el sistema con nombre, correo, teléfono y contraseña. Valida todos los campos antes de enviar.

**Campos del formulario:**
- 👤 Nombre del acudiente
- 🏫 Colegio
- 📧 Correo electrónico
- 📱 Teléfono
- 🔒 Contraseña
- 🔒 Confirmar contraseña

**Navegación:**
- → `login.js` si ya tiene cuenta
- ← Volver a `welcome.js`

---

### `forgot-password.js`
**¿Qué hace?**
Pantalla donde el usuario ingresa su correo para recibir un código de recuperación de contraseña. Envía una petición al backend para generar y enviar el código por email.

**Navegación:**
- → `verify-code.js` después de enviar el correo
- ← Volver a `login.js`

---

### `verify-code.js`
**¿Qué hace?**
El usuario ingresa el código de 6 dígitos que recibió en su correo. Verifica el código contra el backend para permitir el restablecimiento de contraseña.

**Navegación:**
- → `reset-password.js` si el código es correcto
- ← Volver a `forgot-password.js`

---

### `reset-password.js`
**¿Qué hace?**
Formulario para crear una nueva contraseña. Requiere ingresar la nueva contraseña dos veces para confirmar. Una vez exitoso, redirige al login.

**Campos del formulario:**
- 🔒 Nueva contraseña
- 🔒 Confirmar nueva contraseña

**Navegación:**
- → `login.js` si el cambio fue exitoso
- ← Volver a `verify-code.js`

---

## 📁 Subcarpeta `(tabs)/` — Pantallas Principales

> Las pantallas dentro de este grupo son las que forman el **menú de navegación inferior** (tab bar) de la aplicación. Solo son accesibles si el usuario está autenticado.

```
(tabs)/
├── _layout.js          → Header global, barra de navegación inferior y menú web
├── index.js            → Dashboard principal (pantalla de inicio)
├── student.js          → Gestión de hijos/estudiantes
├── notifications.js    → Centro de notificaciones y alertas
├── tracking.js         → Seguimiento GPS en tiempo real
├── history.js          → Historial de trayectos
├── zones.js            → Configuración de zonas seguras y rutas
└── profile.js          → Perfil del usuario y configuraciones
```

---

### `_layout.js` (tabs)
**¿Qué hace?**
Es el cerebro del menú principal. Contiene:
1. **CustomHeader**: Barra superior con el nombre de la app, indicador LIVE/Offline parpadeante, menú de navegación web y selector de idioma.
2. **TabLayoutInner**: Configuración de las 7 pestañas del menú inferior con sus íconos.
3. **Modal de Idioma**: Ventana flotante para cambiar entre Español e Inglés.

---

### `index.js` — Dashboard
**¿Qué hace?**
Pantalla de inicio que muestra un resumen general del estado de todos los hijos. Incluye:
- Tarjetas con el conteo de hijos activos, alertas y trayectos del día.
- Lista de hijos registrados con su estado actual (En Zona Segura / En Trayecto / Alerta).
- Sección de notificaciones recientes.
- Acceso rápido al mapa de seguimiento.

---

### `student.js` — Gestión de Hijos
**¿Qué hace?**
Pantalla central para administrar todos los hijos/estudiantes vinculados a la cuenta. Permite:
- **Ver** todos los hijos en tarjetas visuales con foto, estado y contacto de emergencia.
- **Agregar** un nuevo hijo con formulario completo.
- **Editar** los datos de un hijo existente.
- **Eliminar** un hijo y todos sus datos asociados (historial y notificaciones).
- **Cambiar estado** del hijo manualmente (Zona Segura / En Trayecto / Alerta).
- **Tomar foto** del hijo usando la cámara del dispositivo.

---

### `notifications.js` — Notificaciones
**¿Qué hace?**
Centro de alertas y notificaciones del sistema. Muestra todos los eventos generados, clasificados por tipo:
- ✅ **Exitosas**: El hijo llegó a zona segura.
- ⚠️ **Advertencias**: El hijo salió de la zona segura.
- ℹ️ **Informativas**: El hijo está en camino.

Permite filtrar por tipo y eliminar notificaciones individualmente.

---

### `tracking.js` — Seguimiento GPS
**¿Qué hace?**
Pantalla de rastreo en tiempo real. Muestra el mapa con la ubicación actual del hijo seleccionado. Incluye:
- Mapa interactivo con marcador del estudiante.
- Panel de información: estado, velocidad, última actualización.
- Alerta de incidentes recientes.
- Selector de hijo cuando hay varios registrados.

---

### `history.js` — Historial de Trayectos
**¿Qué hace?**
Registro histórico de todos los eventos y trayectos realizados por los hijos. Permite:
- **Filtrar** por nombre de hijo y fecha.
- **Ver tarjetas** con detalles de cada trayecto (hora inicio/fin, estado, observación, ruta).
- **Estadísticas rápidas**: Total, Completados, En Proceso, Con Incidentes.
- **Eliminar** registros individuales del historial.
- Soporte bilingüe completo (ES/EN) incluyendo fechas y horas.

---

### `zones.js` — Zonas Seguras y Rutas
**¿Qué hace?**
Configuración de las zonas geográficas seguras y rutas asignadas para cada hijo. Permite:
- **Crear y editar zonas seguras** (ej: Casa, Colegio) con nombre, dirección y radio de cobertura.
- **Crear y editar rutas** con punto de inicio y llegada.
- Selección del hijo al que pertenece cada configuración.

---

### `profile.js` — Perfil y Configuración
**¿Qué hace?**
Pantalla de perfil del acudiente con todas las configuraciones de la app. Incluye:
- **Edición del perfil**: nombre, email, teléfono, foto.
- **Preferencias de notificaciones**: llegada, salida, desvío, batería baja, email, SMS.
- **Seguridad**: cambio de contraseña, autenticación de dos factores.
- **Selector de idioma**: acceso directo al cambio de idioma.
- **Cerrar sesión**.
