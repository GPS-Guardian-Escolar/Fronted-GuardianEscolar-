# 🧭 Navegación — Expo Router (File-System Routing)
## GPS Guardian Escolar

> Cómo está organizado el sistema de rutas, por qué se eligió Expo Router sobre React Navigation puro, y cómo se implementaron los grupos de rutas protegidas.

---

## ¿Qué es Expo Router?

Expo Router implementa **file-system routing** — el mismo paradigma que usan frameworks web como Next.js. La posición y el nombre de cada archivo `.js` dentro de la carpeta `app/` define automáticamente la ruta de navegación.

### Comparación: React Navigation manual vs. Expo Router

```javascript
// ─── React Navigation manual (lo que habría que hacer SIN Expo Router) ───
const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        {/* ... cada ruta declarada manualmente */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

```javascript
// ─── Con Expo Router (lo que se usa en este proyecto) ───
// No hay configuración. El archivo en app/(auth)/login.js
// ES automáticamente la ruta /(auth)/login
// Nada más que hacer.
```

---

## Mapa de Rutas del Proyecto

```
app/                         RUTA GENERADA
├── _layout.js               (raíz — envuelve todo)
├── student-dashboard.js     /student-dashboard
│
├── (auth)/                  GRUPO: no aparece en la URL
│   ├── _layout.js           (configura el Stack de auth)
│   ├── welcome.js           /(auth)/welcome  → /welcome
│   ├── info.js              /(auth)/info     → /info
│   ├── login.js             /(auth)/login    → /login
│   ├── register.js          /(auth)/register → /register
│   ├── forgot-password.js   → /forgot-password
│   ├── verify-code.js       → /verify-code
│   └── reset-password.js    → /reset-password
│
└── (tabs)/                  GRUPO: no aparece en la URL
    ├── _layout.js           (configura el Tab Navigator)
    ├── index.js             /(tabs)          → / (raíz del menú)
    ├── student.js           /(tabs)/student
    ├── notifications.js     /(tabs)/notifications
    ├── tracking.js          /(tabs)/tracking
    ├── history.js           /(tabs)/history
    ├── zones.js             /(tabs)/zones
    └── profile.js           /(tabs)/profile
```

---

## Grupos de Rutas — El Propósito de los Paréntesis `()`

Los paréntesis en `(auth)` y `(tabs)` crean **grupos de rutas** que:
1. **No aparecen en la URL final** — `/login` en vez de `/(auth)/login`.
2. **Comparten un `_layout.js`** propio que solo aplica a las rutas dentro del grupo.
3. **Permiten diferentes tipos de navegación** — auth usa Stack, tabs usa Tab Navigator.

```
(auth)/_layout.js  →  Stack Navigator (pantallas apiladas, puede volver atrás)
(tabs)/_layout.js  →  Tab Navigator (menú inferior con pestañas)
```

---

## El `_layout.js` Raíz — Punto de Entrada y Guard de Autenticación

Este es el primer archivo que ejecuta Expo Router. Su función más crítica es actuar como **guard de autenticación**: decidir si mostrar el flujo de auth o las tabs.

```javascript
// app/_layout.js (simplificado)
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function RootLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();    // ['(auth)', 'login'] o ['(tabs)', 'history']

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // No autenticado intentando acceder a tabs → redirigir a login
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      // Autenticado intentando ir a auth → redirigir a tabs
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  return (
    <LanguageProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </LanguageProvider>
  );
}
```

---

## Tipos de Navegación

### Stack Navigation (Flujo de Autenticación)

Usado en `(auth)/`. Las pantallas se "apilan" — al navegar hacia adelante la pantalla anterior queda en memoria, y al presionar "Atrás" se "desapila".

```
welcome → login → (autenticado) → tabs
   ↑         ↑
   └─────────┘  (router.back() o gesto de deslizar)
```

```javascript
// Navegar hacia adelante
router.push('/(auth)/login');

// Reemplazar sin dejar historial (no puede volver atrás)
router.replace('/(tabs)');

// Volver a la pantalla anterior
router.back();
```

### Tab Navigation (Menú Principal)

Usado en `(tabs)/`. Todas las pantallas existen simultáneamente. Cambiar de tab no destruye la pantalla anterior — se mantiene en memoria.

```
[Home] [Child] [Notifications] [Tracking] [History] [Zones] [Profile]
          ↑                         ↑
    tap para ir             tap para ir
    (no se "apila")         (no se "apila")
```

---

## Navegación con Parámetros

Para pasar datos entre pantallas (ej: el ID del estudiante al ir al mapa):

```javascript
// Enviar parámetro
router.push({
  pathname: '/(tabs)/tracking',
  params: { id: student.id, name: student.nombre }
});

// Recibir en tracking.js
import { useLocalSearchParams } from 'expo-router';

export default function TrackingScreen() {
  const { id, name } = useLocalSearchParams();
  // id = '1234', name = 'María Pérez'
}
```

---

## `useFocusEffect` — El Hook de Ciclo de Vida de Pantallas

A diferencia de páginas web donde cada navegación recarga la página, en React Native los componentes pueden mantenerse montados. `useFocusEffect` resuelve el problema de "datos obsoletos":

```javascript
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

// PROBLEMA: useEffect solo corre al montar el componente
// Si ya está montado y el usuario vuelve a navegar aquí, NO corre de nuevo

// SOLUCIÓN: useFocusEffect corre cada vez que la pantalla entra en foco
useFocusEffect(
  useCallback(() => {
    console.log('Pantalla activa — cargando datos frescos');
    loadData();

    return () => {
      console.log('Pantalla perdió el foco');
      // Limpieza opcional (cancelar timers, subscripciones, etc.)
    };
  }, [])   // ← El array vacío evita recrear el callback en cada render
);
```

**Usado en:** `history.js`, `notifications.js`, `student.js`, `zones.js` — cualquier pantalla que muestre datos que pueden cambiar en otra pantalla.

---

## Configuración del Header Global — `(tabs)/_layout.js`

Expo Router permite inyectar un header completamente personalizado:

```javascript
// (tabs)/_layout.js
<Tabs
  screenOptions={{
    headerShown: true,
    header: () => <CustomHeader />,   // ← Nuestro header, no el nativo
    tabBarStyle: {
      height: 60 + insets.bottom,     // Respeta el safe area de iOS
      paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
    }
  }}
>
```

`CustomHeader` es un componente propio que incluye:
- Nombre de la app + badge LIVE parpadeante (animated).
- Menú de navegación horizontal para web (reemplaza las tabs).
- Globo de idioma con selector modal.
- Detección de conectividad en tiempo real (ping cada 3 segundos).

---

## Detección de Ruta Activa (Menú Web)

En web, la barra inferior de tabs no se ve bien en pantallas grandes. Por eso el menú web usa links en el header, y necesita resaltar el link de la ruta actual:

```javascript
const pathname = usePathname();
// pathname = '/(tabs)/history'

const isActive = pathname === item.route
              || (item.route === '/(tabs)' && pathname === '/');

<TouchableOpacity onPress={() => router.push(item.route)}>
  <Text style={[styles.navLink, isActive && styles.navLinkActive]}>
    {t(item.labelKey)}
  </Text>
</TouchableOpacity>
```
