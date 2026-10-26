# 📖 Explicación General del Proyecto
## GPS Guardian Escolar — Documentación Completa

> **¿Qué es Guardian Escolar?**
> Es una aplicación móvil y web para que los padres/acudientes puedan rastrear en tiempo real el trayecto de sus hijos desde la casa al colegio y viceversa, recibir alertas si el niño sale de su ruta segura, y llevar un historial completo de todos los eventos.

---

## 🎯 Objetivo del Proyecto

Brindar **tranquilidad** a los padres de familia mediante un sistema de monitoreo GPS que:
1. Muestra la ubicación en tiempo real del estudiante en un mapa.
2. Alerta inmediatamente si el niño sale de su zona segura o ruta asignada.
3. Registra el historial completo de todos los trayectos.
4. Permite gestionar múltiples hijos desde una sola cuenta.

---

## 👥 Usuarios del Sistema

| Rol | Descripción |
|---|---|
| **Acudiente / Padre** | Usuario principal. Crea la cuenta, registra sus hijos y monitorea sus trayectos. |
| **Estudiante** | No interactúa directamente con la app. Lleva el dispositivo con el tracker GPS. |
| **Administrador** | Acceso futuro para gestión escolar masiva de estudiantes y rutas. |

---

## 🏛️ Arquitectura del Proyecto

### Tipo de Aplicación
**Frontend Móvil y Web** — No tiene base de datos propia. Todo el backend, autenticación y GPS viene de un servidor externo.

```
┌─────────────────────────────────────────┐
│           GPS Guardian Escolar          │
│         (Este Proyecto — Frontend)      │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ Pantallas│  │  Estado  │  │ Utils │ │
│  │  (app/)  │  │(contexts)│  │(utils)│ │
│  └────┬─────┘  └────┬─────┘  └───────┘ │
│       │             │                   │
│  ┌────▼─────────────▼───┐               │
│  │    Capa de Servicios  │               │
│  │      (services/)      │               │
│  └────────────┬──────────┘               │
└───────────────┼──────────────────────────┘
                │  HTTP / WebSocket
                ▼
┌──────────────────────────────┐
│   Backend Guardian Escolar   │
│  (Servidor Java/Spring Boot) │
│                              │
│  • API REST (Autenticación)  │
│  • API REST (Estudiantes)    │
│  • WebSocket (GPS en vivo)   │
│  • Base de Datos (PostgreSQL)│
└──────────────────────────────┘
```

---

## 📱 Plataformas Soportadas

| Plataforma | Estado | Observación |
|---|---|---|
| **Android** | ✅ Funcional | Mapa GPS completo, notificaciones push |
| **iOS** | ✅ Funcional | Mapa GPS completo, notificaciones push |
| **Web (Chrome/Firefox)** | ✅ Funcional | Mapa simulado, resto 100% funcional |

> La misma base de código funciona en las 3 plataformas gracias a **React Native Web** y **Expo**.

---

## 🔀 Flujo Completo del Usuario

### Primer Uso (Registro)
```
1. Abre la app → Pantalla de Bienvenida
2. Toca "Registrarse" → Formulario de Registro
3. Completa datos → Cuenta creada
4. Va al Login → Inicia sesión
5. Llega al Dashboard → Agrega su primer hijo
6. Configura zona segura en "Zonas"
7. ¡Listo para monitorear!
```

### Uso Diario
```
1. Abre la app → Dashboard (resumen general)
2. Ve el estado de sus hijos en las tarjetas
3. Si hay alerta 🔴 → Va a "Seguimiento" para ver el mapa
4. Al final del día → Va a "Historial" para revisar los trayectos
5. Revisa "Notificaciones" para ver el resumen del día
```

---

## 📂 Resumen de Todas las Carpetas

| Carpeta | Tipo | Propósito |
|---|---|---|
| `app/` | Pantallas | Contiene todas las pantallas de la app organizadas por ruta |
| `app/(auth)/` | Pantallas | Flujo de autenticación (welcome → login → registro → recuperar) |
| `app/(tabs)/` | Pantallas | Menú principal (dashboard, estudiantes, mapa, historial, etc.) |
| `assets/` | Recursos | Imágenes, logos, íconos e íconos de la app |
| `components/` | UI | Piezas visuales reutilizables (botones, inputs, mapa, etc.) |
| `config/` | Config | Configuración global del entorno y la API |
| `constants/` | Config | Valores fijos: colores oficiales de la marca |
| `contexts/` | Estado | Estado global compartido entre pantallas (sesión, idioma, GPS) |
| `features/` | Módulos | Organización por funcionalidad (futuro escalamiento) |
| `hooks/` | Lógica | Custom hooks: autenticación, GPS, notificaciones, API |
| `scripts/` | Herramientas | Scripts de mantenimiento del proyecto |
| `services/` | API | Comunicación con el servidor (HTTP y WebSocket) |
| `translations/` | i18n | Diccionario de textos en Español e Inglés |
| `utils/` | Funciones | Funciones utilitarias: almacenamiento, validaciones, formateo |

---

## 🔑 Archivos Más Importantes

| Archivo | Por qué es crítico |
|---|---|
| `app/_layout.js` | Punto de entrada de toda la app. Sin él, nada funciona. |
| `app/(tabs)/_layout.js` | Define el menú principal, el header y el selector de idioma. |
| `constants/colors.js` | Toda la identidad visual depende de este archivo. |
| `contexts/LanguageContext.js` | Sin este, el sistema bilingüe no funciona. |
| `utils/studentStorage.js` | Gestiona todos los datos locales de la app. |
| `translations/index.js` | Sin este, todos los textos serían solo en español. |
| `services/api.js` | Si falla este, la app no puede comunicarse con el servidor. |
| `components/SafeMap.js` | Sin este, el mapa rompería la versión web. |

---

## 🔧 Variables de Entorno (`.env`)

El archivo `.env` en la raíz del proyecto contiene las variables de configuración sensibles que **no deben subirse a GitHub**:

```
EXPO_PUBLIC_API_URL=http://[IP-del-servidor]:8080
EXPO_PUBLIC_WS_URL=ws://[IP-del-servidor]:8080/ws
```

> **Importante:** Para conectar la app al backend durante desarrollo local, se usa Cloudflare Tunnel o la IP local de la computadora donde corre el servidor.

---

## 📦 Dependencias Clave

| Librería | Versión | Para qué se usa |
|---|---|---|
| `expo-router` | 55.x | Sistema de navegación basado en archivos |
| `react-native-paper` | ^5.15 | Componentes UI con Material Design |
| `@react-native-async-storage/async-storage` | 2.2.0 | Almacenamiento local persistente |
| `axios` | ^1.14 | Peticiones HTTP al backend |
| `react-native-maps` | 1.27.2 | Mapas GPS nativos |
| `@stomp/stompjs` | ^7.3 | WebSockets para GPS en tiempo real |
| `expo-location` | 55.x | Acceso al GPS del dispositivo |
| `expo-image-picker` | 55.x | Cámara y galería para fotos de hijos |
| `expo-notifications` | 55.x | Notificaciones push |
| `react-native-web` | ~0.21 | Compatibilidad con navegadores web |

---

## 🚀 Cómo Ejecutar el Proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar en modo desarrollo (con caché limpio)
npx expo start -c

# 3. Opciones:
# Presionar 'w' → Abrir en navegador web
# Presionar 'a' → Abrir en emulador Android
# Escanear QR → Abrir en Expo Go (móvil físico)
```

---

## 📊 Estado Actual del Proyecto

| Módulo | Estado |
|---|---|
| Autenticación (UI) | ✅ Completo |
| Dashboard | ✅ Completo |
| Gestión de Estudiantes | ✅ Completo |
| Seguimiento GPS (UI) | ✅ Completo |
| Mapa en tiempo real | ⚠️ Requiere conexión al backend GPS |
| Historial | ✅ Completo |
| Notificaciones | ✅ Completo |
| Zonas y Rutas | ✅ Completo (UI) |
| Perfil | ✅ Completo |
| Soporte Bilingüe (ES/EN) | ✅ Completo |
| Integración con Backend | 🔄 En progreso |
| Notificaciones Push | 🔄 En progreso |

---

## 🗓️ Versión

- **Versión de la App:** 1.0.0
- **Nombre del paquete:** `gps-guardian-escolar`
- **Plataforma base:** Expo SDK 55 / React Native 0.83.4 / React 19.2
