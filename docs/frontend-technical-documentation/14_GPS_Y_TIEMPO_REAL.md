# 📡 GPS, Mapas y Tiempo Real
## GPS Guardian Escolar

> El núcleo funcional del sistema. Esta sección documenta cómo se implementa el seguimiento de ubicación, por qué el mapa funciona diferente en web vs. móvil, y cómo está preparado el sistema para recibir coordenadas GPS en tiempo real del backend.

---

## ¿Qué problema resuelve este módulo?

El acudiente necesita saber **en tiempo real** dónde está su hijo durante el trayecto escolar. Esto implica tres retos técnicos:

1. **Obtener coordenadas GPS** del dispositivo del estudiante.
2. **Transmitirlas al servidor** en tiempo real (no puede ser HTTP polling — demasiada latencia).
3. **Mostrarlas en un mapa** en la app del padre, actualizándose sin que él haga nada.

---

## El Desafío: Web vs. Móvil

`react-native-maps` — la librería de mapas elegida — usa el motor **nativo** de mapas del SO:
- **Android:** Google Maps SDK nativo.
- **iOS:** MapKit / Google Maps SDK.
- **Web:** ❌ No tiene implementación. Simplemente no existe.

Intentar renderizar `<MapView>` en un navegador lanza un error fatal. La solución fue crear un **componente de abstracción** que decide qué renderizar según la plataforma.

---

## `SafeMap.js` — El Envoltorio Inteligente

```javascript
// components/SafeMap.js
import { Platform } from 'react-native';

// La importación del mapa real solo ocurre en móvil
// En web, esta importación nunca se ejecuta (y no falla)
let MapView, Marker, Circle;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker  = Maps.Marker;
  Circle  = Maps.Circle;
}

export default function SafeMap({ students, showRoute, style }) {
  // ── VERSIÓN WEB ──────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webMapContainer, style]}>
        {/* Simulación visual del mapa para web */}
        <View style={styles.webMapGrid}>
          {/* Cuadrícula de calles simuladas */}
        </View>
        {/* Marcadores de estudiantes en posición aproximada */}
        {students?.map(student => (
          <View key={student.id} style={[styles.webMarker, { backgroundColor: student.color }]}>
            <Text style={styles.webMarkerLabel}>{student.label}</Text>
          </View>
        ))}
        <Text style={styles.webMapNote}>
          📍 Mapa interactivo disponible en la app móvil
        </Text>
      </View>
    );
  }

  // ── VERSIÓN MÓVIL ────────────────────────────────────────────────────────
  return (
    <MapView
      style={[{ flex: 1 }, style]}
      initialRegion={{
        latitude: 6.2518,       // Coordenadas por defecto (Medellín, Colombia)
        longitude: -75.5636,
        latitudeDelta: 0.01,    // Zoom inicial
        longitudeDelta: 0.01,
      }}
      showsUserLocation={true}  // Punto azul con la ubicación del padre
      showsMyLocationButton={true}
    >
      {students?.map(student => (
        <StudentMarker key={student.id} student={student} />
      ))}
    </MapView>
  );
}
```

### ¿Por qué `require()` en vez de `import`?

```javascript
// ❌ Esto fallaría en web — la importación es estática y siempre se evalúa
import MapView from 'react-native-maps';

// ✅ require() es dinámico — solo se ejecuta cuando Platform.OS !== 'web'
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
}
```

Las importaciones `import` de ES Modules son **estáticas** y se resuelven en tiempo de compilación, antes de que el código corra. `require()` es dinámico y se ejecuta en tiempo de ejecución, permitiendo la condición.

---

## Componentes del Mapa

### `StudentMarker.js` — El Pin Personalizado

En lugar del pin rojo genérico de Google Maps, se muestra un marcador personalizado con las iniciales del estudiante y el color de su estado:

```javascript
// components/map/StudentMarker.js
import { Marker } from 'react-native-maps';

function StudentMarker({ student }) {
  return (
    <Marker
      coordinate={{
        latitude: student.location.lat,
        longitude: student.location.lng
      }}
      title={student.nombre}
      description={`Estado: ${student.status}`}
    >
      {/* Marcador personalizado en vez del pin por defecto */}
      <View style={[styles.markerContainer, { backgroundColor: student.color }]}>
        <Text style={styles.markerLabel}>{student.label}</Text>
        {/* Triángulo apuntando hacia abajo (como un pin) */}
        <View style={[styles.markerTail, { borderTopColor: student.color }]} />
      </View>
    </Marker>
  );
}
```

### `SafeZoneCircle.js` — La Zona Segura

```javascript
// components/map/SafeZoneCircle.js
import { Circle } from 'react-native-maps';

function SafeZoneCircle({ zone }) {
  return (
    <Circle
      center={{ latitude: zone.lat, longitude: zone.lng }}
      radius={parseInt(zone.radius)}         // En metros (ej: 150)
      fillColor="rgba(123, 199, 77, 0.15)"   // Verde lima translúcido
      strokeColor="rgba(123, 199, 77, 0.6)"  // Borde más sólido
      strokeWidth={2}
    />
  );
}
```

### `RoutePolyline.js` — La Ruta Recorrida

```javascript
// components/map/RoutePolyline.js
import { Polyline } from 'react-native-maps';

function RoutePolyline({ coordinates }) {
  return (
    <Polyline
      coordinates={coordinates}              // Array de {latitude, longitude}
      strokeColor={COLORS.PRIMARIO}          // Azul medianoche
      strokeWidth={3}
      lineDashPattern={[1]}                  // Línea sólida
    />
  );
}
```

---

## WebSockets — Tiempo Real con STOMP

### ¿Por qué WebSocket y no HTTP polling?

| Enfoque | Cómo funciona | Problema |
|---|---|---|
| **HTTP Polling** | El cliente pregunta al servidor cada N segundos | Latencia = N segundos. Con N=2s → 2s de retraso mínimo. Alta carga del servidor. |
| **Long Polling** | El cliente espera hasta que hay datos nuevos | Mejor, pero aún ineficiente. Requiere reconectar en cada respuesta. |
| **WebSocket** ✅ | Conexión persistente bidireccional | Latencia ~50ms. El servidor envía cuando tiene datos. Una sola conexión. |

### Protocolo STOMP sobre WebSocket

El backend usa **Spring Boot con STOMP/SockJS**. STOMP es un protocolo de mensajería que corre sobre WebSocket, similar a cómo HTTP corre sobre TCP.

```
Cliente (App)          Servidor (Spring Boot)
     │                       │
     │── CONNECT ────────────▶│
     │◀─ CONNECTED ──────────│
     │                       │
     │── SUBSCRIBE ──────────▶│
     │   /topic/student/123  │
     │                       │
     │   [estudiante se mueve]│
     │◀─ MESSAGE ────────────│
     │   { lat: 6.25,        │
     │     lng: -75.56 }     │
     │                       │
     │── DISCONNECT ─────────▶│
```

### Implementación en `services/socket.js`

```javascript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;

export function connectToTracking(studentId, onLocationUpdate) {
  stompClient = new Client({
    // SockJS provee fallback si WebSocket nativo no está disponible
    webSocketFactory: () => new SockJS(`${process.env.EXPO_PUBLIC_WS_URL}/ws`),

    onConnect: () => {
      console.log('WebSocket conectado');

      // Suscribirse al canal del estudiante específico
      stompClient.subscribe(
        `/topic/tracking/${studentId}`,
        (message) => {
          const location = JSON.parse(message.body);
          // { lat: 6.2518, lng: -75.5636, speed: 25, timestamp: 1746220800000 }
          onLocationUpdate(location);
        }
      );
    },

    onDisconnect: () => console.log('WebSocket desconectado'),
    onStompError: (frame) => console.error('Error STOMP:', frame),

    // Reconexión automática cada 5 segundos si se pierde la conexión
    reconnectDelay: 5000,
  });

  stompClient.activate();
  return stompClient;
}

export function disconnectFromTracking() {
  if (stompClient?.active) {
    stompClient.deactivate();
  }
}
```

### Uso en `tracking.js`

```javascript
// (tabs)/tracking.js
useEffect(() => {
  if (!selectedStudent) return;

  const client = connectToTracking(selectedStudent.id, (location) => {
    setStudentLocation(location);       // Actualiza el estado
    mapRef.current?.animateToRegion({   // Mueve el mapa suavemente
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);  // Animación de 1 segundo
  });

  // Limpieza: desconectar al cambiar de estudiante o salir de la pantalla
  return () => disconnectFromTracking();
}, [selectedStudent?.id]);
```

---

## Obtención del GPS del Padre

La app también puede mostrar la ubicación del acudiente en el mapa usando el GPS del propio dispositivo:

```javascript
// hooks/useLocation.js
import * as Location from 'expo-location';

export function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      // 1. Solicitar permiso (muestra diálogo nativo del SO)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado');
        return;
      }

      // 2. Suscripción continua con alta precisión
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,    // GPS de alta precisión
          timeInterval: 3000,                  // Actualizar cada 3 segundos
          distanceInterval: 5,                 // O cada 5 metros de movimiento
        },
        (loc) => setLocation(loc.coords)
      );

      return () => subscription.remove();      // Limpiar al desmontar
    })();
  }, []);

  return { location, error };
}
```

---

## Indicador de Conectividad — El Badge LIVE

El badge parpadeante en la barra superior no es decorativo — detecta activamente si la app puede comunicarse con el servidor:

```javascript
// (tabs)/_layout.js — CustomHeader
const checkConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);  // Timeout 3s

    // En web usa un endpoint de Apple que siempre responde sin CORS
    // En móvil usa el de Google que es más rápido
    const url = Platform.OS === 'web'
      ? 'https://captive.apple.com/generate_204'
      : 'http://connectivitycheck.gstatic.com/generate_204';

    await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    setIsOnline(true);
  } catch (e) {
    setIsOnline(false);
  }
};

// Verificar cada 3 segundos
const interval = setInterval(checkConnection, 3000);
```

La animación del punto es una `Animated.Value` que hace un loop infinito entre opacidad 0.3 y 1.0:

```javascript
Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
    Animated.timing(pulseAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
  ])
).start();
```

`useNativeDriver: true` es crítico — hace que la animación corra en el hilo nativo de UI, no en el hilo JavaScript, garantizando 60fps sin bloquear interacciones.
