# 📦 Dependencias del Proyecto — Análisis Completo
## GPS Guardian Escolar

> Cada dependencia fue elegida por una razón específica. Este documento justifica técnicamente cada decisión de librería, describe su propósito y muestra cómo se usa en el proyecto.

---

## Dependencias de Producción

### 🏗️ Base del Proyecto

---

#### `react` — v19.2.0
**¿Qué es?** La librería central de UI. Toda la interfaz de la app se construye como un árbol de componentes React.

**¿Por qué esta versión?** React 19 introduce mejoras en la gestión de estado asíncrono y el compilador optimizador. Expo 55 la requiere para funcionar correctamente.

**Cómo se usa en el proyecto:**
```javascript
import React, { useState, useEffect, useCallback } from 'react';
// useState → estado local de componentes (listas, formularios, modales)
// useEffect → cargar datos al montar una pantalla
// useCallback → memoizar funciones para evitar re-renders innecesarios
```

---

#### `react-native` — v0.83.4
**¿Qué es?** El framework que permite escribir interfaces nativas de Android e iOS usando JavaScript. Traduce los componentes React a widgets nativos del sistema operativo.

**¿Por qué no Flutter, Swift o Kotlin?** React Native permite compartir ~90% del código entre iOS, Android y Web con un solo equipo de desarrollo usando JavaScript.

**Componentes usados en el proyecto:**
```javascript
import {
  View,              // Contenedor (equivale a <div>)
  Text,              // Texto (equivale a <p>/<span>)
  StyleSheet,        // Sistema de estilos
  FlatList,          // Listas optimizadas para grandes datasets
  ScrollView,        // Contenido desplazable
  TouchableOpacity,  // Elemento táctil con efecto de opacidad
  Alert,             // Diálogos nativos del SO
  Platform,          // Detección de plataforma (iOS/Android/Web)
  Dimensions,        // Dimensiones de la pantalla
  Modal,             // Ventana flotante
  TextInput,         // Campo de texto nativo
  Animated,          // Animaciones (punto LIVE parpadeante)
  RefreshControl,    // Pull-to-refresh en listas
} from 'react-native';
```

---

#### `expo` — v55.x
**¿Qué es?** Una plataforma que extiende React Native con APIs nativas pre-configuradas y un flujo de desarrollo simplificado. Sin Expo, acceder a la cámara, GPS o notificaciones requeriría código nativo en Java/Kotlin/Swift.

**Lo que Expo gestiona automáticamente:**
- Compilación para Android/iOS/Web desde el mismo código.
- Permisos de cámara y GPS.
- Hot reload durante el desarrollo.
- El bundle del servidor de desarrollo.

---

### 🧭 Navegación

---

#### `expo-router` — v55.x
**¿Qué es?** Sistema de navegación basado en el sistema de archivos (file-system routing). El nombre de cada archivo `.js` dentro de `app/` se convierte automáticamente en una ruta.

**¿Por qué no React Navigation directamente?** Expo Router usa React Navigation por debajo, pero elimina la necesidad de definir rutas manualmente. Inspirado en Next.js.

**Cómo se usa:**
```javascript
import { useRouter, useFocusEffect, usePathname } from 'expo-router';

const router = useRouter();
router.push('/(tabs)/tracking');   // Navegar a la pantalla de seguimiento
router.back();                      // Volver a la pantalla anterior
router.replace('/(auth)/login');    // Reemplazar (sin volver atrás)

// Detectar qué pantalla está activa (para el menú web)
const pathname = usePathname();
const isActive = pathname === '/(tabs)';

// Ejecutar código cada vez que el usuario vuelve a esta pantalla
useFocusEffect(useCallback(() => {
  loadData();
}, []));
```

---

#### `@react-navigation/native`, `bottom-tabs`, `stack`, `elements`
**¿Qué son?** Las librerías base que Expo Router usa internamente. También se importan directamente para configuraciones avanzadas de navegación.

---

### 🎨 Interfaz de Usuario

---

#### `react-native-paper` — v5.15
**¿Qué es?** Librería de componentes UI que implementa Material Design 3 para React Native. Incluye botones, inputs, tarjetas, avatares, FABs, y más.

**¿Por qué no hacerlo manual?** Cada componente de Paper incluye: estados de hover/press, animaciones, accesibilidad, temas, y soporte multiplataforma. Implementarlos desde cero costaría semanas.

**Componentes Paper usados en el proyecto:**

| Componente | Pantalla donde se usa |
|---|---|
| `<Surface elevation={n}>` | Tarjetas con sombra en dashboard, students, history |
| `<Avatar.Text label="MP">` | Iniciales de estudiante en todas las pantallas |
| `<Avatar.Image source={uri}>` | Foto del estudiante en student.js |
| `<FAB icon="plus">` | Botón flotante "+" para agregar estudiante |
| `<Button mode="contained">` | Botón principal en formularios y modales |
| `<TextInput mode="outlined">` | Campos de formulario con label animado |
| `<Searchbar>` | Barra de búsqueda en historial y notificaciones |
| `<IconButton icon="trash">` | Botón de eliminar en tarjetas |
| `<Text variant="...">` | Tipografía con variantes M3 |

---

#### `@expo/vector-icons` — (incluido en expo)
**¿Qué es?** Colección de packs de íconos vectoriales (MaterialCommunityIcons, Ionicons, FontAwesome, etc.) listos para usar en React Native.

**¿Por qué no SVGs o imágenes?** Los íconos vectoriales escalan sin pérdida de calidad, se colorean con una prop `color`, tienen tamaño configurable y no requieren ningún archivo de imagen.

**Uso en el proyecto:**
```javascript
import { MaterialCommunityIcons } from '@expo/vector-icons';

<MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.PRIMARIO} />
<MaterialCommunityIcons name="map-search-outline" size={24} color="#fff" />
<MaterialCommunityIcons name="trash-can" size={16} color={COLORS.ALERTA} />
```

**Pack elegido:** `MaterialCommunityIcons` (6,000+ íconos), alineado con Material Design 3 que usa React Native Paper.

---

### 💾 Almacenamiento y Datos

---

#### `@react-native-async-storage/async-storage` — v2.2.0
**¿Qué es?** API de clave-valor para almacenar datos de forma persistente en el dispositivo. Equivale a `localStorage` del navegador pero para React Native.

**¿Por qué no SQLite o Realm?** Para los volúmenes de datos de esta app (pocos estudiantes, notificaciones y registros), `AsyncStorage` es más que suficiente, sin la complejidad de un motor de base de datos.

**Claves usadas en el proyecto:**

| Clave AsyncStorage | Contenido |
|---|---|
| `@guardian_estudiantes` | Array de estudiantes con zonas y rutas |
| `@guardian_notificaciones` | Array de últimas 50 notificaciones |
| `@guardian_historial` | Array de últimos 50 registros de trayecto |
| `@guardian_language` | Código del idioma activo (`'es'` \| `'en'`) |
| `gps_guardian_accounts` | Cuentas de usuario registradas |
| `gps_guardian_token` | Token JWT de sesión activa |
| `gps_guardian_user` | Datos del usuario en sesión |

**Patrón de uso:**
```javascript
// Guardar
await AsyncStorage.setItem('@guardian_language', 'en');

// Leer
const data = await AsyncStorage.getItem('@guardian_estudiantes');
const students = data ? JSON.parse(data) : [];

// Eliminar
await AsyncStorage.removeItem('@guardian_notificaciones');
```

---

#### `axios` — v1.14
**¿Qué es?** Cliente HTTP basado en Promises para hacer peticiones REST al backend. Alternativa más robusta al `fetch` nativo.

**Ventajas sobre `fetch`:**
- Interceptores para adjuntar el JWT automáticamente a todas las peticiones.
- Manejo centralizado de errores HTTP.
- Timeout configurable.
- Transformación automática de JSON.

**Configuración en el proyecto (`services/api.js`):**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: adjunta el token a cada petición
api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

#### `expo-secure-store`
**¿Qué es?** Almacenamiento seguro y cifrado para datos sensibles como tokens JWT. En iOS usa el Keychain, en Android el Keystore.

**¿Por qué no AsyncStorage para el token?** AsyncStorage no está cifrado. Cualquier app en un dispositivo rooteado podría leer su contenido. Los tokens de autenticación deben ir en almacenamiento seguro.

---

### 🗺️ Mapas y Ubicación

---

#### `react-native-maps` — v1.27.2
**¿Qué es?** Componente de mapas nativos para React Native. En Android usa Google Maps, en iOS usa Apple Maps o Google Maps (configurable).

**¿Por qué no Leaflet o Mapbox?** `react-native-maps` provee acceso a los mapas **nativos del sistema operativo**, lo que resulta en mejor rendimiento, gestos nativos y soporte offline automático.

**Limitación importante:** No funciona en navegadores web. Por eso existe `SafeMap.js` — un envoltorio que detecta la plataforma y muestra una alternativa en web.

```javascript
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';

<MapView
  style={{ flex: 1 }}
  region={{ latitude: 6.25, longitude: -75.56, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
>
  <Marker coordinate={{ latitude: 6.25, longitude: -75.56 }} />
  <Circle center={{ latitude: 6.25, longitude: -75.56 }} radius={150} />
</MapView>
```

---

#### `expo-location`
**¿Qué es?** API de Expo para acceder al GPS del dispositivo.

**Uso en el proyecto:**
```javascript
import * as Location from 'expo-location';

// Solicitar permiso
const { status } = await Location.requestForegroundPermissionsAsync();

// Obtener posición actual
const position = await Location.getCurrentPositionAsync({});
// → { coords: { latitude, longitude, accuracy, speed } }

// Suscripción para actualizaciones en tiempo real
const subscription = await Location.watchPositionAsync(
  { accuracy: Location.Accuracy.High, timeInterval: 5000 },
  (location) => { /* nueva posición */ }
);
```

---

### ⚡ Tiempo Real

---

#### `@stomp/stompjs` — v7.3 + `sockjs-client` — v1.6
**¿Qué son?** STOMP (Simple Text Oriented Message Protocol) es un protocolo de mensajería sobre WebSockets. SockJS es una librería que provee fallbacks si WebSocket no está disponible.

**¿Por qué no WebSocket puro?** El backend usa Spring Boot con STOMP/SockJS. Para comunicarse con él, el cliente necesita el mismo protocolo.

**¿Qué es un WebSocket?** A diferencia de HTTP (donde el cliente pregunta y el servidor responde), un WebSocket mantiene una conexión abierta bidireccional. El servidor puede enviar actualizaciones de GPS **sin que el cliente las solicite**.

```javascript
// socket.js — Conexión al servidor de tracking en tiempo real
const client = new Client({
  webSocketFactory: () => new SockJS(`${WS_URL}/ws`),
  onConnect: () => {
    client.subscribe(`/topic/student/${studentId}`, (message) => {
      const location = JSON.parse(message.body);
      // Actualizar posición en el mapa
    });
  }
});
client.activate();
```

---

### 📷 Recursos del Dispositivo

---

#### `expo-image-picker`
**¿Qué es?** API para abrir la galería de fotos o la cámara del dispositivo y obtener la imagen seleccionada.

**Uso en `student.js`:**
```javascript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],      // Recorte cuadrado
  quality: 0.7,        // Compresión del 70%
});

if (!result.canceled) {
  setForm(prev => ({ ...prev, foto: result.assets[0].uri }));
}
```

---

#### `expo-notifications`
**¿Qué es?** API para registrar el dispositivo para recibir notificaciones push y gestionar notificaciones locales.

**Uso planeado:** Cuando el backend detecte que un estudiante salió de la zona segura, envía una notificación push al token del dispositivo del padre, que aparece en la bandeja de notificaciones aunque la app esté cerrada.

---

### 🌐 Web

---

#### `react-native-web` — v0.21
**¿Qué es?** Librería que "traduce" los componentes de React Native al DOM del navegador. Permite que el mismo código `.js` funcione en un navegador web sin modificaciones.

**¿Cómo funciona?** Intercepta las importaciones de `react-native` y las reemplaza por implementaciones basadas en HTML/CSS:

```
React Native       →    react-native-web      →    Navegador
─────────────────────────────────────────────────────────────
<View>             →    <div role="group">
<Text>             →    <span>
StyleSheet         →    Objeto CSS inline
flexbox            →    flexbox CSS nativo
```

**Limitación:** Algunos componentes nativos (especialmente `react-native-maps`) no tienen equivalente web y requieren componentes alternativos como `SafeMap.js`.

---

#### `expo-web-browser`
**¿Qué es?** API para abrir URLs en el navegador del sistema (no dentro de un WebView). Se usa para abrir términos de servicio o links externos.

---

### 🔒 Seguridad

---

#### `react-native-dotenv`
**¿Qué es?** Permite importar variables del archivo `.env` en el código JavaScript.

**Uso en el proyecto:**
```
# .env
EXPO_PUBLIC_API_URL=https://mi-backend.trycloudflare.com
EXPO_PUBLIC_WS_URL=wss://mi-backend.trycloudflare.com/ws
```

```javascript
// services/api.js
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,  // ← Leído del .env
});
```

**Por qué es importante:** Las URLs del backend NO deben estar hardcodeadas en el código fuente (especialmente si el proyecto se sube a GitHub). El `.env` está en `.gitignore`.

---

## Dependencias de Desarrollo

| Dependencia | Uso |
|---|---|
| `typescript` v5.9 | Verificación de tipos (el proyecto usa JS con validación TS opcional) |
| `@types/react` | Tipos de TypeScript para React |

---

## Mapa de Dependencias por Módulo

```
Autenticación        → authService (AsyncStorage) + expo-secure-store
Navegación           → expo-router → @react-navigation/*
UI/Estilos           → react-native + react-native-paper + MaterialCommunityIcons
Mapas                → react-native-maps + expo-location + SafeMap.js (web fallback)
Tiempo Real GPS      → @stomp/stompjs + sockjs-client
Almacenamiento local → @react-native-async-storage/async-storage
API REST             → axios + react-native-dotenv + .env
Foto de perfil       → expo-image-picker
Notificaciones push  → expo-notifications + expo-device
Soporte web          → react-native-web + react-dom
Idioma               → (solución propia) LanguageContext + AsyncStorage
```
