# 🔐 Autenticación y Seguridad
## GPS Guardian Escolar

> Cómo funciona el sistema de autenticación, qué decisiones se tomaron en el modo de desarrollo (mock) vs. producción, y cuáles son los mecanismos de seguridad implementados.

---

## Visión General

El sistema de autenticación está implementado en **dos capas**:

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Servicio | `services/auth.service.js` | Lógica de negocio: login, registro, cambio de contraseña |
| Contexto | `contexts/AuthContext.js` | Estado global de sesión y distribución a la UI |
| Hook | `hooks/useAuth.js` | Interfaz simplificada para los componentes |
| Storage | `utils/storage.js` | Persistencia del token y datos de sesión |

---

## Modo Actual: Mock Local (Desarrollo)

> **Importante para la exposición:** El sistema actualmente opera en modo **mock local**. Las cuentas se almacenan en el propio dispositivo (AsyncStorage), no en un servidor externo. Esto fue una decisión deliberada para permitir el desarrollo del frontend sin depender del backend.

```javascript
// services/auth.service.js — Cómo funciona el login mock
login: async (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {    // ← Simula latencia de red (800ms)
      const accounts = await getAccounts();   // Lee cuentas del AsyncStorage local

      const account = accounts.find(
        a => a.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!account) reject(new Error('No existe una cuenta con ese correo.'));
      if (account.password !== password) reject(new Error('Contraseña incorrecta.'));

      // Genera un token ficticio (en producción vendría del servidor)
      const fakeToken = `mock_token_${account.id}_${Date.now()}`;

      await storage.setToken(fakeToken);    // Guarda en SecureStore
      await storage.setUser(sessionUser);   // Guarda en SecureStore

      resolve({ token: fakeToken, user: sessionUser });
    }, 800);
  });
}
```

### Cuenta Demo Precargada

Para facilitar las pruebas sin registrarse, existe una cuenta de demostración hardcodeada:

```
Email:    demo@guardian.com
Password: Demo@1234
Rol:      PARENT
```

Esta cuenta se inyecta automáticamente al leer las cuentas si no existe:
```javascript
const hasDemo = saved.some(a => a.email === 'demo@guardian.com');
if (!hasDemo) {
  saved.push({ email: 'demo@guardian.com', password: 'Demo@1234', ... });
}
```

---

## Flujo de Autenticación Completo

### Registro de Nueva Cuenta

```
register.js
  ↓ Validación de campos (validators.js)
  ↓ authService.register({ name, email, password, phone })
  ↓ Verifica que el email no esté registrado
  ↓ Crea objeto de cuenta con id = Date.now()
  ↓ Guarda en AsyncStorage['gps_guardian_accounts']
  ↓ router.replace('/(auth)/login')
```

### Login con Credenciales

```
login.js
  ↓ authService.login(email, password)
  ↓ Verifica email → verifica password
  ↓ ¿Tiene 2FA activo?
      → SÍ: devuelve { requires2FA: true }
             UI pide código de verificación
             authService.complete2FALogin(email)
      → NO: genera token mock
             storage.setToken(token)   ← SecureStore (cifrado)
             storage.setUser(user)     ← SecureStore (cifrado)
  ↓ AuthContext.setUser(userData)
  ↓ useEffect en _layout.js detecta user → router.replace('/(tabs)')
```

### Recuperación de Contraseña

```
forgot-password.js → ingresa email
  ↓ (simulado: en producción enviaría email real)
  
verify-code.js → ingresa código de 6 dígitos
  ↓ (simulado: código estático para testing)
  
reset-password.js → nueva contraseña + confirmación
  ↓ authService.updatePassword(email, currentPass, newPass)
  ↓ Actualiza la cuenta en AsyncStorage
  ↓ router.replace('/(auth)/login')
```

---

## Autenticación de Dos Factores (2FA)

El sistema soporta 2FA por email (preparado para SMS en el futuro):

```javascript
// Activar 2FA (desde profile.js)
await authService.update2FA(user.email, true, 'email');
// → Guarda twoFAEnabled: true, twoFAMethod: 'email' en la cuenta

// En el próximo login:
const result = await authService.login(email, password);
if (result.requires2FA) {
  // Mostrar pantalla de código
  // El usuario ingresa el código → complete2FALogin(email)
}
```

---

## Persistencia y Seguridad del Token

### ¿Por qué SecureStore y no AsyncStorage para el token?

```javascript
// ❌ Inseguro — AsyncStorage NO está cifrado
await AsyncStorage.setItem('token', jwtToken);

// ✅ Seguro — SecureStore usa Keychain (iOS) / Keystore (Android)
await SecureStore.setItemAsync('token', jwtToken);
```

`expo-secure-store` almacena datos en el área de almacenamiento cifrado del SO:
- **iOS:** Apple Keychain Services — protegido por el enclave seguro del chip.
- **Android:** Android Keystore System — cifrado AES-256.

### La Capa de Abstracción — `utils/storage.js`

```javascript
// utils/storage.js — Centraliza el acceso al SecureStore
export const storage = {
  setToken: (token) => SecureStore.setItemAsync('gps_guardian_token', token),
  getToken: ()       => SecureStore.getItemAsync('gps_guardian_token'),
  setUser:  (user)   => SecureStore.setItemAsync('gps_guardian_user', JSON.stringify(user)),
  getUser:  async () => {
    const raw = await SecureStore.getItemAsync('gps_guardian_user');
    return raw ? JSON.parse(raw) : null;
  },
  clearAll: async () => {
    await SecureStore.deleteItemAsync('gps_guardian_token');
    await SecureStore.deleteItemAsync('gps_guardian_user');
  }
};
```

---

## `AuthContext` — Estado Global de Sesión

```javascript
// contexts/AuthContext.js
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al arrancar la app: restaurar sesión desde SecureStore
  useEffect(() => {
    storage.getUser().then(savedUser => {
      setUser(savedUser);      // null si no había sesión
      setIsLoading(false);     // La app puede navegar ahora
    });
  }, []);

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    setUser(result.user);      // Actualiza estado global → _layout.js detecta y navega
    return result;
  };

  const logout = async () => {
    await authService.logout();   // Limpia SecureStore
    setUser(null);                // Estado global → _layout.js detecta y va a welcome
  };
}
```

---

## Guard de Rutas — Protección Automática

La protección de rutas es automática gracias al efecto en `app/_layout.js`:

```javascript
useEffect(() => {
  if (isLoading) return;   // Esperar a que se restaure la sesión

  const inAuthGroup = segments[0] === '(auth)';

  if (!user && !inAuthGroup) {
    // Sin sesión + intenta acceder a tabs → forzar a welcome
    router.replace('/(auth)/welcome');
  } else if (user && inAuthGroup) {
    // Con sesión + intenta acceder a auth → forzar a tabs
    router.replace('/(tabs)');
  }
}, [user, isLoading, segments]);
```

Esto significa que **ninguna pantalla de tabs es accesible sin sesión activa**, y **ninguna pantalla de auth es accesible con sesión activa**, sin necesidad de proteger cada pantalla individualmente.

---

## Preparación para Producción (Backend Real)

Cuando se integre el backend Spring Boot, el `authService` se actualiza así:

```javascript
// Actual (mock)
login: async (email, password) => {
  const accounts = await AsyncStorage.getItem('gps_guardian_accounts');
  // ...lógica local
}

// Con backend real
login: async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  // response.data = { token: 'JWT...', user: { id, name, email, role } }
  await storage.setToken(response.data.token);
  await storage.setUser(response.data.user);
  return response.data;
}
```

El `AuthContext` y todos los componentes UI **no necesitan cambiar**. Solo el servicio subyacente.

---

## Estructura de Datos de la Cuenta de Usuario

```json
{
  "id": 1746220800000,
  "email": "padre@ejemplo.com",
  "name": "Juan Pérez",
  "phone": "3001234567",
  "role": "PARENT",
  "twoFAEnabled": false,
  "twoFAMethod": "email"
}
```

### Roles Implementados

| Rol | Descripción | Estado |
|---|---|---|
| `PARENT` | Acudiente/padre — acceso completo a sus hijos | ✅ Activo |
| `ADMIN` | Administrador escolar — gestión masiva | 🔄 Preparado (sin UI aún) |
| `STUDENT` | Vista del estudiante (`student-dashboard.js`) | 🔄 En desarrollo |
