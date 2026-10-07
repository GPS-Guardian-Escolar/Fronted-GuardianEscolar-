# ðŸ“± Carpeta `app/` â€” Pantallas Principales
## GPS Guardian Escolar

> Esta carpeta contiene **todas las pantallas** de la aplicaciÃ³n, organizadas siguiendo el sistema de rutas de **Expo Router** (navegaciÃ³n basada en el nombre del archivo).

---

## Â¿QuÃ© es Expo Router?

Expo Router funciona como las carpetas de un sitio web: el nombre del archivo se convierte en la URL/ruta de navegaciÃ³n automÃ¡ticamente. No hace falta definir rutas manualmente.

```
app/
â”œâ”€â”€ (auth)/        â†’ Rutas de autenticaciÃ³n (NO requieren login)
â”œâ”€â”€ (tabs)/        â†’ Rutas del menÃº principal (SÃ requieren login)
â”œâ”€â”€ _layout.js     â†’ ConfiguraciÃ³n raÃ­z de toda la app
â””â”€â”€ student-dashboard.js â†’ Pantalla especial del panel del estudiante
```

---

## ðŸ“„ Archivos en la raÃ­z de `app/`

---

### `_layout.js`
**Â¿QuÃ© hace?**
Es el archivo mÃ¡s importante de toda la aplicaciÃ³n. Se ejecuta **primero** cada vez que la app abre. Su funciÃ³n es:
1. Envolver toda la app con los `Providers` globales (`AuthContext`, `LanguageContext`, `UserRoleContext`).
2. Decidir si el usuario va al flujo de **autenticaciÃ³n** (`(auth)/`) o a las **pantallas principales** (`(tabs)/`).
3. Configurar la barra de estado del sistema operativo.

**Sin este archivo, la app no funciona.**

---

### `student-dashboard.js`
**Â¿QuÃ© hace?**
Pantalla especial que muestra el panel de control desde el **punto de vista del estudiante** (no del padre/acudiente). Muestra el estado del trayecto activo, la ruta asignada y la zona segura actual.

---

## ðŸ“ Subcarpeta `(auth)/` â€” Flujo de AutenticaciÃ³n

> Las pantallas dentro de los parÃ©ntesis `(auth)` son un **grupo de rutas**. El nombre entre parÃ©ntesis **no aparece en la URL**, solo agrupa lÃ³gicamente las pantallas.

```
(auth)/
â”œâ”€â”€ _layout.js          â†’ Configura la navegaciÃ³n dentro del grupo auth
â”œâ”€â”€ welcome.js          â†’ Pantalla de bienvenida (primera vez)
â”œâ”€â”€ login.js            â†’ Inicio de sesiÃ³n
â”œâ”€â”€ register.js         â†’ Registro de nuevo acudiente
â”œâ”€â”€ forgot-password.js  â†’ Solicitud de recuperaciÃ³n de contraseÃ±a
â”œâ”€â”€ verify-code.js      â†’ Ingreso del cÃ³digo de verificaciÃ³n por email
â””â”€â”€ reset-password.js   â†’ CreaciÃ³n de nueva contraseÃ±a
```

---

### `_layout.js` (auth)
**Â¿QuÃ© hace?**
Define la pila de navegaciÃ³n (Stack Navigator) para el flujo de autenticaciÃ³n. Oculta el header nativo y permite las animaciones de transiciÃ³n entre pantallas de login.

---

### `welcome.js`
**Â¿QuÃ© hace?**
Primera pantalla que ve el usuario al instalar la app. Muestra el logo de **GPS Guardian Escolar**, el eslogan del proyecto y dos botones: "Iniciar SesiÃ³n" y "Registrarse".

**NavegaciÃ³n:**
- â†’ `login.js`
- â†’ `register.js`

---


### `login.js`
**Â¿QuÃ© hace?**
Formulario de inicio de sesiÃ³n. Solicita correo electrÃ³nico y contraseÃ±a. Consume el servicio `auth.service.js` para autenticarse contra el backend. Si el login es exitoso, redirige al menÃº principal `(tabs)/`.

**Campos del formulario:**
- ðŸ“§ Correo electrÃ³nico
- ðŸ”’ ContraseÃ±a
- â˜‘ï¸ Recordarme

**NavegaciÃ³n:**
- â†’ `(tabs)/` si login exitoso
- â†’ `forgot-password.js` si olvidÃ³ contraseÃ±a
- â†’ `register.js` si no tiene cuenta
- â† Volver a `welcome.js`

---

### `register.js`
**Â¿QuÃ© hace?**
Formulario de registro para nuevos acudientes/padres. Crea una cuenta en el sistema con nombre, correo, telÃ©fono y contraseÃ±a. Valida todos los campos antes de enviar.

**Campos del formulario:**
- ðŸ‘¤ Nombre del acudiente
- ðŸ« Colegio
- ðŸ“§ Correo electrÃ³nico
- ðŸ“± TelÃ©fono
- ðŸ”’ ContraseÃ±a
- ðŸ”’ Confirmar contraseÃ±a

**NavegaciÃ³n:**
- â†’ `login.js` si ya tiene cuenta
- â† Volver a `welcome.js`

---

### `forgot-password.js`
**Â¿QuÃ© hace?**
Pantalla donde el usuario ingresa su correo para recibir un cÃ³digo de recuperaciÃ³n de contraseÃ±a. EnvÃ­a una peticiÃ³n al backend para generar y enviar el cÃ³digo por email.

**NavegaciÃ³n:**
- â†’ `verify-code.js` despuÃ©s de enviar el correo
- â† Volver a `login.js`

---

### `verify-code.js`
**Â¿QuÃ© hace?**
El usuario ingresa el cÃ³digo de 6 dÃ­gitos que recibiÃ³ en su correo. Verifica el cÃ³digo contra el backend para permitir el restablecimiento de contraseÃ±a.

**NavegaciÃ³n:**
- â†’ `reset-password.js` si el cÃ³digo es correcto
- â† Volver a `forgot-password.js`

---

### `reset-password.js`
**Â¿QuÃ© hace?**
Formulario para crear una nueva contraseÃ±a. Requiere ingresar la nueva contraseÃ±a dos veces para confirmar. Una vez exitoso, redirige al login.

**Campos del formulario:**
- ðŸ”’ Nueva contraseÃ±a
- ðŸ”’ Confirmar nueva contraseÃ±a

**NavegaciÃ³n:**
- â†’ `login.js` si el cambio fue exitoso
- â† Volver a `verify-code.js`

---

## ðŸ“ Subcarpeta `(tabs)/` â€” Pantallas Principales

> Las pantallas dentro de este grupo son las que forman el **menÃº de navegaciÃ³n inferior** (tab bar) de la aplicaciÃ³n. Solo son accesibles si el usuario estÃ¡ autenticado.

```
(tabs)/
â”œâ”€â”€ _layout.js          â†’ Header global, barra de navegaciÃ³n inferior y menÃº web
â”œâ”€â”€ index.js            â†’ Dashboard principal (pantalla de inicio)
â”œâ”€â”€ student.js          â†’ GestiÃ³n de hijos/estudiantes
â”œâ”€â”€ notifications.js    â†’ Centro de notificaciones y alertas
â”œâ”€â”€ tracking.js         â†’ Seguimiento GPS en tiempo real
â”œâ”€â”€ history.js          â†’ Historial de trayectos
â”œâ”€â”€ zones.js            â†’ ConfiguraciÃ³n de zonas seguras y rutas
â””â”€â”€ profile.js          â†’ Perfil del usuario y configuraciones
```

---

### `_layout.js` (tabs)
**Â¿QuÃ© hace?**
Es el cerebro del menÃº principal. Contiene:
1. **CustomHeader**: Barra superior con el nombre de la app, indicador LIVE/Offline parpadeante, menÃº de navegaciÃ³n web y selector de idioma.
2. **TabLayoutInner**: ConfiguraciÃ³n de las 7 pestaÃ±as del menÃº inferior con sus Ã­conos.
3. **Modal de Idioma**: Ventana flotante para cambiar entre EspaÃ±ol e InglÃ©s.

---

### `index.js` â€” Dashboard
**Â¿QuÃ© hace?**
Pantalla de inicio que muestra un resumen general del estado de todos los hijos. Incluye:
- Tarjetas con el conteo de hijos activos, alertas y trayectos del dÃ­a.
- Lista de hijos registrados con su estado actual (En Zona Segura / En Trayecto / Alerta).
- SecciÃ³n de notificaciones recientes.
- Acceso rÃ¡pido al mapa de seguimiento.

---

### `student.js` â€” GestiÃ³n de Hijos
**Â¿QuÃ© hace?**
Pantalla central para administrar todos los hijos/estudiantes vinculados a la cuenta. Permite:
- **Ver** todos los hijos en tarjetas visuales con foto, estado y contacto de emergencia.
- **Agregar** un nuevo hijo con formulario completo.
- **Editar** los datos de un hijo existente.
- **Eliminar** un hijo y todos sus datos asociados (historial y notificaciones).
- **Cambiar estado** del hijo manualmente (Zona Segura / En Trayecto / Alerta).
- **Tomar foto** del hijo usando la cÃ¡mara del dispositivo.

---

### `notifications.js` â€” Notificaciones
**Â¿QuÃ© hace?**
Centro de alertas y notificaciones del sistema. Muestra todos los eventos generados, clasificados por tipo:
- âœ… **Exitosas**: El hijo llegÃ³ a zona segura.
- âš ï¸ **Advertencias**: El hijo saliÃ³ de la zona segura.
- â„¹ï¸ **Informativas**: El hijo estÃ¡ en camino.

Permite filtrar por tipo y eliminar notificaciones individualmente.

---

### `tracking.js` â€” Seguimiento GPS
**Â¿QuÃ© hace?**
Pantalla de rastreo en tiempo real. Muestra el mapa con la ubicaciÃ³n actual del hijo seleccionado. Incluye:
- Mapa interactivo con marcador del estudiante.
- Panel de informaciÃ³n: estado, velocidad, Ãºltima actualizaciÃ³n.
- Alerta de incidentes recientes.
- Selector de hijo cuando hay varios registrados.

---

### `history.js` â€” Historial de Trayectos
**Â¿QuÃ© hace?**
Registro histÃ³rico de todos los eventos y trayectos realizados por los hijos. Permite:
- **Filtrar** por nombre de hijo y fecha.
- **Ver tarjetas** con detalles de cada trayecto (hora inicio/fin, estado, observaciÃ³n, ruta).
- **EstadÃ­sticas rÃ¡pidas**: Total, Completados, En Proceso, Con Incidentes.
- **Eliminar** registros individuales del historial.
- Soporte bilingÃ¼e completo (ES/EN) incluyendo fechas y horas.

---

### `zones.js` â€” Zonas Seguras y Rutas
**Â¿QuÃ© hace?**
ConfiguraciÃ³n de las zonas geogrÃ¡ficas seguras y rutas asignadas para cada hijo. Permite:
- **Crear y editar zonas seguras** (ej: Casa, Colegio) con nombre, direcciÃ³n y radio de cobertura.
- **Crear y editar rutas** con punto de inicio y llegada.
- SelecciÃ³n del hijo al que pertenece cada configuraciÃ³n.

---

### `profile.js` â€” Perfil y ConfiguraciÃ³n
**Â¿QuÃ© hace?**
Pantalla de perfil del acudiente con todas las configuraciones de la app. Incluye:
- **EdiciÃ³n del perfil**: nombre, email, telÃ©fono, foto.
- **Preferencias de notificaciones**: llegada, salida, desvÃ­o, baterÃ­a baja, email, SMS.
- **Seguridad**: cambio de contraseÃ±a, autenticaciÃ³n de dos factores.
- **Selector de idioma**: acceso directo al cambio de idioma.
- **Cerrar sesiÃ³n**.
