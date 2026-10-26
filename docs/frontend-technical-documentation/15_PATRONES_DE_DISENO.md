# 🏛️ Patrones de Diseño Implementados
## GPS Guardian Escolar

> Un patrón de diseño es una solución probada y reutilizable a un problema recurrente en el desarrollo de software. Este documento identifica y explica los patrones que se aplicaron en el proyecto y **por qué** se eligió cada uno.

---

## 1. Provider Pattern — Contextos de React

**Problema que resuelve:** Compartir datos globales (sesión, idioma) entre componentes arbitrariamente anidados sin pasar props manualmente por cada nivel de la jerarquía ("prop drilling").

**¿Cómo funciona en el proyecto?**

```
app/_layout.js
└── <LanguageProvider>        ← Provee t(), lang, setLanguage
    └── <AuthProvider>        ← Provee user, login(), logout()
        └── <UserRoleProvider>← Provee role
            └── (tabs)/_layout.js
                └── history.js
                    └── const { t } = useLanguage()  ← Accede sin props
```

Sin el Provider Pattern, `history.js` necesitaría recibir `t` como prop de `(tabs)/_layout.js`, que lo recibiría de `app/_layout.js`, que lo recibiría de… Es inmanejable.

**Implementación:**
```javascript
// Patrón completo: Context + Provider + Hook de consumo
const LanguageContext = createContext(defaultValues);      // 1. Crear contexto

export function LanguageProvider({ children }) {           // 2. Provider
  const [lang, setLang] = useState('es');
  const t = useCallback((key) => translations[lang]?.[key] ?? key, [lang]);
  return (
    <LanguageContext.Provider value={{ lang, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext); // 3. Hook de consumo
```

**Contextos del proyecto:**
| Provider | Provee | Consumidores |
|---|---|---|
| `LanguageProvider` | `t()`, `lang`, `setLanguage` | Todas las pantallas |
| `AuthProvider` | `user`, `login()`, `logout()` | `_layout.js`, `profile.js` |
| `UserRoleProvider` | `role` | Pantallas con lógica de permisos |
| `TrackingProvider` | Estado GPS en tiempo real | `tracking.js`, `dashboard` |

---

## 2. Repository Pattern — `studentStorage.js`

**Problema que resuelve:** Desacoplar la lógica de negocio (¿qué hacer con los datos?) del mecanismo de persistencia (¿cómo y dónde guardarlos?). Si mañana AsyncStorage se reemplaza por SQLite o una API REST, solo cambia `studentStorage.js` — las pantallas no tocan nada.

**Sin Repository Pattern (acoplado):**
```javascript
// student.js — La pantalla conoce los detalles de AsyncStorage
const data = await AsyncStorage.getItem('@guardian_estudiantes');
const students = data ? JSON.parse(data) : [];
const updated = [...students, newStudent];
await AsyncStorage.setItem('@guardian_estudiantes', JSON.stringify(updated));
setStudents(updated);
```

**Con Repository Pattern (desacoplado):**
```javascript
// student.js — Solo conoce la interfaz
const updated = await addStudent(formData);  // ← No sabe cómo se guarda
setStudents(updated);

// studentStorage.js — El único que sabe el "cómo"
export async function addStudent(studentData) {
  const students = await getStudents();
  const newStudent = { ...studentData, id: generateId() };
  const updated = [...students, newStudent];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
```

**API del Repository:**
```
studentStorage.js (Repository de Estudiantes)
├── getStudents()           → Lee todos
├── addStudent(data)        → Crea nuevo
├── updateStudent(id, data) → Actualiza existente
└── deleteStudent(id)       → Elimina + limpia notificaciones y historial

Notificaciones:
├── getNotifications()      → Lee todas
├── addNotification(notif)  → Crea nueva (máx. 50 guardadas)
└── deleteNotification(id)  → Elimina por ID

Historial:
├── getHistory()            → Lee todos
├── addHistory(entry)       → Crea nuevo (máx. 50 guardados)
└── deleteHistory(id)       → Elimina por ID
```

---

## 3. Custom Hook Pattern — Reutilización de Lógica

**Problema que resuelve:** Extraer lógica stateful compleja (efectos, estado, cálculos) fuera de los componentes para que sea reutilizable y testeable de forma independiente.

**Ejemplo — `useAuth.js`:**
```javascript
// hooks/useAuth.js — Lógica de autenticación extraída del componente
export function useAuth() {
  const { user, setUser } = useContext(AuthContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error, user };
}
```

**En el componente — sin lógica de negocio:**
```javascript
// login.js — Solo UI, sin lógica de negocio
export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();

  return (
    <View>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button onPress={() => login(email, password)} loading={isLoading}>
        Iniciar Sesión
      </Button>
    </View>
  );
}
```

**Custom Hooks del proyecto:**
| Hook | Lógica encapsulada |
|---|---|
| `useAuth()` | Login, registro, logout, estado de carga |
| `useLanguage()` | Traducción, cambio de idioma |
| `useLocation()` | GPS del dispositivo, permisos, actualizaciones |
| `useTracking()` | Conexión WebSocket, coordenadas en tiempo real |
| `useApi()` | Peticiones HTTP, estado de carga, manejo de errores |

---

## 4. Compound Component Pattern — `StatCard` en History

**Problema que resuelve:** Crear componentes cuya configuración interna (qué hace al tocarlo) se define externamente, sin sobrecargar de props.

```javascript
// history.js — StatCard es un compound component local
const StatCard = ({ title, value, icon, color, type }) => {
  const isActive = statusFilter === type;    // ← Conoce el estado del padre

  return (
    <TouchableOpacity
      onPress={() => setStatusFilter(type)}  // ← Modifica el estado del padre
      style={[
        styles.statCard,
        isActive && { backgroundColor: color + '25', borderWidth: 2 }
      ]}
    >
      <Surface style={[styles.statIconWrap, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={18} color={COLORS.BLANCO} />
        <Text style={styles.statValue}>{value}</Text>
      </Surface>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );
};

// Uso: los 4 StatCards actúan como filtros interactivos de la lista
<StatCard title={t('histTotal')}           type="all"          ... />
<StatCard title={t('histFilterCompleted')} type="Completado"   ... />
<StatCard title={t('histInProcess')}       type="En Proceso"   ... />
<StatCard title={t('histFilterIncident')}  type="Con Incidente"... />
```

---

## 5. Guard Pattern — Protección de Rutas

**Problema que resuelve:** Garantizar que ciertas pantallas solo sean accesibles bajo condiciones específicas (usuario autenticado), sin duplicar lógica de verificación en cada pantalla.

```javascript
// app/_layout.js — Un único guard que protege TODAS las tabs
useEffect(() => {
  if (isLoading) return;

  const inAuthGroup = segments[0] === '(auth)';
  const needsAuth   = !inAuthGroup;              // tabs necesitan auth
  const hasAuth     = !!user;

  if (needsAuth && !hasAuth) {
    router.replace('/(auth)/welcome');           // Sin sesión → a welcome
  } else if (!needsAuth && hasAuth) {
    router.replace('/(tabs)');                   // Con sesión → a tabs
  }
}, [user, isLoading, segments]);
```

**Resultado:** Las 7 pantallas de tabs están protegidas con estas 10 líneas. Ninguna pantalla individual necesita verificar si hay sesión.

---

## 6. Optimistic Update Pattern — Eliminación Inmediata en UI

**Problema que resuelve:** Las operaciones de escritura en AsyncStorage son asíncronas. Sin este patrón, el usuario toca "Eliminar" y la tarjeta tarda 200-500ms en desaparecer — se siente lento.

**Sin Optimistic Update (lento):**
```javascript
// 1. Llamar a AsyncStorage (200-500ms)
await deleteStudent(id);
// 2. Recargar la lista completa (otros 200ms)
const updated = await getStudents();
// 3. Actualizar UI — el usuario esperó ~700ms
setStudents(updated);
```

**Con Optimistic Update (instantáneo):**
```javascript
// 1. Actualizar UI INMEDIATAMENTE (0ms de espera)
setStudents(prev => prev.filter(s => s.id !== id));
// 2. Persistir en background (el usuario no espera)
deleteStudent(id).catch(() => {
  // Si falla: revertir el estado (rollback)
  loadStudents();
});
```

> Este patrón se usa implícitamente en las pantallas de Historial y Notificaciones cuando se elimina un registro de los datos mock — la eliminación es solo de la UI local, sin llamada a AsyncStorage.

---

## 7. Fallback Chain Pattern — Traducción con Degradación Graceful

**Problema que resuelve:** Si una clave de traducción no existe en el idioma activo, la app no debe romper ni mostrar `undefined`.

```javascript
// contexts/LanguageContext.js
const t = useCallback((key) => {
  return translations[lang]?.[key]      // 1. Intenta en idioma activo (ej: 'en')
      ?? translations['es']?.[key]      // 2. Fallback a español
      ?? key;                           // 3. Último recurso: muestra la clave misma
}, [lang]);
```

**El operador `?.` (optional chaining) + `??` (nullish coalescing) garantizan que nunca se lanza una excepción**, incluso si `translations[lang]` es `undefined` o la clave no existe.

---

## Resumen — Patrones por Archivo

| Archivo | Patrones aplicados |
|---|---|
| `contexts/LanguageContext.js` | Provider Pattern, Fallback Chain |
| `contexts/AuthContext.js` | Provider Pattern |
| `utils/studentStorage.js` | Repository Pattern |
| `hooks/useAuth.js` | Custom Hook Pattern |
| `hooks/useLocation.js` | Custom Hook Pattern |
| `app/_layout.js` | Guard Pattern |
| `app/(tabs)/history.js` | Compound Component (StatCard), Optimistic Update |
| `components/SafeMap.js` | Strategy Pattern (selección de implementación por plataforma) |
