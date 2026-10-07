# ðŸ§­ NavegaciÃ³n â€” Expo Router (File-System Routing)
## GPS Guardian Escolar

> CÃ³mo estÃ¡ organizado el sistema de rutas, por quÃ© se eligiÃ³ Expo Router sobre React Navigation puro, y cÃ³mo se implementaron los grupos de rutas protegidas.

---

## Â¿QuÃ© es Expo Router?

Expo Router implementa **file-system routing** â€” el mismo paradigma que usan frameworks web como Next.js. La posiciÃ³n y el nombre de cada archivo `.js` dentro de la carpeta `app/` define automÃ¡ticamente la ruta de navegaciÃ³n.

### ComparaciÃ³n: React Navigation manual vs. Expo Router

```javascript
// â”€â”€â”€ React Navigation manual (lo que habrÃ­a que hacer SIN Expo Router) â”€â”€â”€
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
// â”€â”€â”€ Con Expo Router (lo que se usa en este proyecto) â”€â”€â”€
// No hay configuraciÃ³n. El archivo en app/(auth)/login.js
// ES automÃ¡ticamente la ruta /(auth)/login
// Nada mÃ¡s que hacer.
```

---

## Mapa de Rutas del Proyecto

```
app/                         RUTA GENERADA
â”œâ”€â”€ _layout.js               (raÃ­z â€” envuelve todo)
â”œâ”€â”€ student-dashboard.js     /student-dashboard
â”‚
â”œâ”€â”€ (auth)/                  GRUPO: no aparece en la URL
â”‚   â”œâ”€â”€ _layout.js           (configura el Stack de auth)
â”‚   â”œâ”€â”€ welcome.js           /(auth)/welcome  â†’ /welcome
â”‚   â”œâ”€â”€ login.js             /(auth)/login    â†’ /login
â”‚   â”œâ”€â”€ register.js          /(auth)/register â†’ /register
â”‚   â”œâ”€â”€ forgot-password.js   â†’ /forgot-password
â”‚   â”œâ”€â”€ verify-code.js       â†’ /verify-code
â”‚   â””â”€â”€ reset-password.js    â†’ /reset-password
â”‚
â””â”€â”€ (tabs)/                  GRUPO: no aparece en la URL
    â”œâ”€â”€ _layout.js           (configura el Tab Navigator)
    â”œâ”€â”€ index.js             /(tabs)          â†’ / (raÃ­z del menÃº)
    â”œâ”€â”€ student.js           /(tabs)/student
    â”œâ”€â”€ notifications.js     /(tabs)/notifications
    â”œâ”€â”€ tracking.js          /(tabs)/tracking
    â”œâ”€â”€ history.js           /(tabs)/history
    â”œâ”€â”€ zones.js             /(tabs)/zones
    â””â”€â”€ profile.js           /(tabs)/profile
```

---

## Grupos de Rutas â€” El PropÃ³sito de los ParÃ©ntesis `()`

Los parÃ©ntesis en `(auth)` y `(tabs)` crean **grupos de rutas** que:
1. **No aparecen en la URL final** â€” `/login` en vez de `/(auth)/login`.
2. **Comparten un `_layout.js`** propio que solo aplica a las rutas dentro del grupo.
3. **Permiten diferentes tipos de navegaciÃ³n** â€” auth usa Stack, tabs usa Tab Navigator.

```
(auth)/_layout.js  â†’  Stack Navigator (pantallas apiladas, puede volver atrÃ¡s)
(tabs)/_layout.js  â†’  Tab Navigator (menÃº inferior con pestaÃ±as)
```

---

## El `_layout.js` RaÃ­z â€” Punto de Entrada y Guard de AutenticaciÃ³n

Este es el primer archivo que ejecuta Expo Router. Su funciÃ³n mÃ¡s crÃ­tica es actuar como **guard de autenticaciÃ³n**: decidir si mostrar el flujo de auth o las tabs.

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
      // No autenticado intentando acceder a tabs â†’ redirigir a login
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      // Autenticado intentando ir a auth â†’ redirigir a tabs
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

## Tipos de NavegaciÃ³n

### Stack Navigation (Flujo de AutenticaciÃ³n)

Usado en `(auth)/`. Las pantallas se "apilan" â€” al navegar hacia adelante la pantalla anterior queda en memoria, y al presionar "AtrÃ¡s" se "desapila".

```
welcome â†’ login â†’ (autenticado) â†’ tabs
   â†‘         â†‘
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  (router.back() o gesto de deslizar)
```

```javascript
// Navegar hacia adelante
router.push('/(auth)/login');

// Reemplazar sin dejar historial (no puede volver atrÃ¡s)
router.replace('/(tabs)');

// Volver a la pantalla anterior
router.back();
```

### Tab Navigation (MenÃº Principal)

Usado en `(tabs)/`. Todas las pantallas existen simultÃ¡neamente. Cambiar de tab no destruye la pantalla anterior â€” se mantiene en memoria.

```
[Home] [Child] [Notifications] [Tracking] [History] [Zones] [Profile]
          â†‘                         â†‘
    tap para ir             tap para ir
    (no se "apila")         (no se "apila")
```

---

## NavegaciÃ³n con ParÃ¡metros

Para pasar datos entre pantallas (ej: el ID del estudiante al ir al mapa):

```javascript
// Enviar parÃ¡metro
router.push({
  pathname: '/(tabs)/tracking',
  params: { id: student.id, name: student.nombre }
});

// Recibir en tracking.js
import { useLocalSearchParams } from 'expo-router';

export default function TrackingScreen() {
  const { id, name } = useLocalSearchParams();
  // id = '1234', name = 'MarÃ­a PÃ©rez'
}
```

---

## `useFocusEffect` â€” El Hook de Ciclo de Vida de Pantallas

A diferencia de pÃ¡ginas web donde cada navegaciÃ³n recarga la pÃ¡gina, en React Native los componentes pueden mantenerse montados. `useFocusEffect` resuelve el problema de "datos obsoletos":

```javascript
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

// PROBLEMA: useEffect solo corre al montar el componente
// Si ya estÃ¡ montado y el usuario vuelve a navegar aquÃ­, NO corre de nuevo

// SOLUCIÃ“N: useFocusEffect corre cada vez que la pantalla entra en foco
useFocusEffect(
  useCallback(() => {
    console.log('Pantalla activa â€” cargando datos frescos');
    loadData();

    return () => {
      console.log('Pantalla perdiÃ³ el foco');
      // Limpieza opcional (cancelar timers, subscripciones, etc.)
    };
  }, [])   // â† El array vacÃ­o evita recrear el callback en cada render
);
```

**Usado en:** `history.js`, `notifications.js`, `student.js`, `zones.js` â€” cualquier pantalla que muestre datos que pueden cambiar en otra pantalla.

---

## ConfiguraciÃ³n del Header Global â€” `(tabs)/_layout.js`

Expo Router permite inyectar un header completamente personalizado:

```javascript
// (tabs)/_layout.js
<Tabs
  screenOptions={{
    headerShown: true,
    header: () => <CustomHeader />,   // â† Nuestro header, no el nativo
    tabBarStyle: {
      height: 60 + insets.bottom,     // Respeta el safe area de iOS
      paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
    }
  }}
>
```

`CustomHeader` es un componente propio que incluye:
- Nombre de la app + badge LIVE parpadeante (animated).
- MenÃº de navegaciÃ³n horizontal para web (reemplaza las tabs).
- Globo de idioma con selector modal.
- DetecciÃ³n de conectividad en tiempo real (ping cada 3 segundos).

---

## DetecciÃ³n de Ruta Activa (MenÃº Web)

En web, la barra inferior de tabs no se ve bien en pantallas grandes. Por eso el menÃº web usa links en el header, y necesita resaltar el link de la ruta actual:

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
