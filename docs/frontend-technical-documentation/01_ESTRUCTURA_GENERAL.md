# 🏗️ Estructura General del Proyecto
## GPS Guardian Escolar — Frontend

> Aplicación móvil y web construida con **React Native + Expo Router** para el seguimiento GPS de estudiantes en tiempo real.

---

## 📂 Árbol de Carpetas

```
Fronted-Guardian-Escolar/
│
├── app/                        ← Pantallas principales (Expo Router)
│   ├── (auth)/                 ← Flujo de autenticación
│   ├── (tabs)/                 ← Pantallas del menú principal
│   ├── _layout.js              ← Layout raíz de la app
│   └── student-dashboard.js    ← Dashboard del estudiante
│
├── assets/                     ← Recursos estáticos
│   ├── expo.icon/              ← Ícono de la app para Expo
│   └── images/                 ← Logos, íconos, splash
│
├── components/                 ← Componentes reutilizables de UI
│   ├── common/                 ← Botones, inputs, alertas genéricas
│   ├── layout/                 ← Contenedores de pantalla
│   ├── map/                    ← Componentes del mapa GPS
│   ├── shared/                 ← Componentes compartidos (futuro)
│   ├── students/               ← Componentes de tarjetas de estudiantes (futuro)
│   ├── tracking/               ← Componentes de seguimiento (futuro)
│   └── SafeMap.js              ← Envoltorio seguro del mapa (web/móvil)
│
├── config/                     ← Configuración global (API, entorno)
│
├── constants/                  ← Valores constantes del proyecto
│   └── colors.js               ← Paleta de colores oficial
│
├── contexts/                   ← Estado global con React Context
│   ├── AuthContext.js          ← Sesión del usuario
│   ├── LanguageContext.js      ← Idioma (ES/EN)
│   ├── TrackingContext.js      ← Estado del rastreo GPS
│   └── UserRoleContext.js      ← Rol del usuario
│
├── features/                   ← Módulos por funcionalidad (arquitectura por features)
│   ├── auth/                   ← Módulo de autenticación
│   ├── profile/                ← Módulo de perfil
│   ├── students/               ← Módulo de gestión de estudiantes
│   └── tracking/               ← Módulo de rastreo GPS
│
├── hooks/                      ← Custom Hooks de React
│   ├── useApi.js               ← Peticiones HTTP genéricas
│   ├── useAuth.js              ← Lógica de sesión
│   ├── useLocation.js          ← GPS y ubicación
│   ├── useNotifications.js     ← Gestión de alertas push
│   └── useTracking.js          ← Rastreo en tiempo real
│
├── scripts/                    ← Scripts de mantenimiento del proyecto
│
├── services/                   ← Capa de comunicación con el Backend (API)
│   ├── api.js                  ← Configuración base de Axios
│   ├── auth.service.js         ← Servicios de login y registro
│   ├── auth/                   ← Sub-módulo de auth (futuro)
│   ├── notification.service.js ← Servicios de notificaciones
│   ├── route.service.js        ← Servicios de rutas GPS
│   ├── shared/                 ← Servicios compartidos (futuro)
│   ├── socket.js               ← Conexión WebSocket en tiempo real
│   ├── student.service.js      ← Servicios de estudiantes
│   ├── students/               ← Sub-módulo de estudiantes (futuro)
│   ├── tracking/               ← Sub-módulo de tracking (futuro)
│   └── tracking.service.js     ← Servicios de seguimiento GPS
│
├── translations/               ← Sistema de traducción (ES/EN)
│   └── index.js                ← Diccionario completo de todos los textos
│
├── utils/                      ← Funciones de utilidad puras
│   ├── calculateDistance.js    ← Cálculo de distancias geográficas
│   ├── formatDate.js           ← Formateo de fechas y horas
│   ├── storage.js              ← AsyncStorage genérico
│   ├── studentStorage.js       ← Almacenamiento específico de la app
│   └── validators.js           ← Validaciones de formularios
│
├── .env                        ← Variables de entorno (URL del backend)
├── app.json                    ← Configuración de Expo (íconos, splash, permisos)
├── package.json                ← Dependencias y scripts npm
└── tsconfig.json               ← Configuración de TypeScript
```

---

## 🔄 Flujo de la Aplicación

```
Usuario abre la App
       ↓
 [app/_layout.js]  ← Decide si ir a Auth o Tabs
       ↓
   ┌───┴───┐
   │       │
(auth)   (tabs)
   │       │
Login    Dashboard → Student → Tracking → History → Notifications → Zones → Profile
```

---

## ⚙️ Tecnologías Utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| React Native | 0.83.4 | Framework base |
| Expo | 55.x | Herramientas y APIs nativas |
| Expo Router | 55.x | Navegación basada en archivos |
| React Native Paper | ^5.15 | Componentes UI Material Design |
| AsyncStorage | 2.2.0 | Almacenamiento local persistente |
| Axios | ^1.14 | Peticiones HTTP al backend |
| React Native Maps | 1.27.2 | Mapas GPS |
| STOMP.js | ^7.3 | WebSockets en tiempo real |
| React Native Web | ~0.21 | Compatibilidad con navegadores |
