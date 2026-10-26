# 🔄 Flujo de Datos y Estado de la Aplicación
## GPS Guardian Escolar

> Cómo viajan los datos desde el almacenamiento hasta la pantalla, y cómo las acciones del usuario propagan cambios a través de toda la aplicación.

---

## Capas de Estado

La aplicación maneja tres niveles de estado:

```
┌─────────────────────────────────────────────────────┐
│  NIVEL 3: Estado de Servidor (futuro)                │
│  Datos en tiempo real del backend GPS                │
│  → TrackingContext, WebSocket (socket.js)            │
├─────────────────────────────────────────────────────┤
│  NIVEL 2: Estado Global (React Context)              │
│  Sesión de usuario, idioma activo, rol               │
│  → AuthContext, LanguageContext, UserRoleContext      │
├─────────────────────────────────────────────────────┤
│  NIVEL 1: Estado Local Persistente (AsyncStorage)    │
│  Estudiantes, historial, notificaciones              │
│  → studentStorage.js                                 │
└─────────────────────────────────────────────────────┘
```

---

## Flujo Principal de Datos — Pantalla de Estudiantes

```
Usuario toca "Guardar" en el formulario de nuevo hijo
                ↓
handleSave() en student.js
                ↓
addStudent(formData)     ← studentStorage.js
                ↓
AsyncStorage.setItem('@guardian_estudiantes', JSON)
                ↓
setStudents(updated)     ← useState local se actualiza
                ↓
React re-renderiza la lista de tarjetas
                ↓
Si tenía status, también llama:
  addNotification({ studentId, type, message })
  addHistory({ studentId, estado, horaInicio })
```

---

## Patrón `useFocusEffect` — Actualización al Volver a la Pantalla

Un problema común en apps de múltiples pantallas: si agregas un estudiante en `student.js` y luego vas a `history.js`, ¿cómo sabe history que hay datos nuevos?

**Solución adoptada:** `useFocusEffect` de Expo Router.

```javascript
// history.js
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

useFocusEffect(
  useCallback(() => {
    loadData();    // ← Se ejecuta CADA VEZ que el usuario navega a esta pantalla
  }, [])
);
```

Esto garantiza que los datos siempre estén actualizados sin necesidad de un store global complejo como Redux.

---

## Flujo de Autenticación

```
Usuario ingresa email + password
           ↓
authService.login(email, password)
           ↓
   ┌────────────────────────────────┐
   │ Busca cuenta en AsyncStorage   │
   │ clave: 'gps_guardian_accounts' │
   └────────────────────────────────┘
           ↓
  ¿Coincide email y password?
     ↓ SÍ              ↓ NO
  ¿Tiene 2FA?      throw Error
   ↓ SÍ    ↓ NO
  Pide    Genera token mock
  código  Guarda en SecureStore
           ↓
  AuthContext.setUser(userData)
           ↓
  router.replace('/(tabs)')
```

---

## Flujo de Eliminación de Estudiante (con Cascada)

Esta es la operación más crítica del sistema porque debe limpiar datos en 3 claves de AsyncStorage de forma atómica:

```
Usuario confirma eliminar a "María Pérez" (id: '1')
                    ↓
deleteStudent('1') — studentStorage.js
                    ↓
  1. Lee lista actual de estudiantes
  2. Filtra: students.filter(s => s.id !== '1')
  3. Guarda lista sin María en '@guardian_estudiantes'
                    ↓
  4. Normaliza el nombre: 'maria pérez' (lowercase, trim)
                    ↓
  5. Lee '@guardian_notificaciones'
  6. Filtra: notifs donde
     - notif.studentId === '1'  → eliminar
     - notif.name.toLowerCase() === 'maria pérez'  → eliminar
     - Cualquier otro → conservar
  7. Guarda notificaciones limpias
                    ↓
  8. Lee '@guardian_historial'
  9. Filtra igual que notificaciones (por ID y nombre)
  10. Guarda historial limpio
                    ↓
  setStudents(updated) → Re-render de la lista
```

**¿Por qué doble filtro (ID y nombre)?** Para manejar datos creados antes de que se implementara el campo `studentId`. La coincidencia por nombre es el fallback de compatibilidad.

---

## Flujo del Sistema de Idioma

```
App arranca → LanguageProvider monta
                    ↓
AsyncStorage.getItem('@guardian_language')
                    ↓
  ¿Hay valor guardado?
   ↓ SÍ                    ↓ NO
setLang(savedCode)       setLang('es')  (default)
                    ↓
          TODA la app usa t('clave')
                    ↓
Usuario cambia idioma en el header:
setLanguage('en')
  → setLang('en')  (estado React)
  → AsyncStorage.setItem('@guardian_language', 'en')
  → useCallback recalcula t()
  → React notifica a TODOS los suscriptores del contexto
  → TODA la UI se re-renderiza en inglés
```

---

## Estructura de los Datos en AsyncStorage

### Estudiante (objeto)
```json
{
  "id": "1234567890abc",
  "nombre": "María Pérez",
  "grado": "3ro Grado",
  "colegio": "Colegio San Jose",
  "edad": "9",
  "label": "MP",
  "color": "#1A4F8A",
  "foto": "file:///path/to/photo.jpg",
  "contacto_nombre": "Ana Pérez",
  "contacto_telefono": "3001234567",
  "status": "SAFE",
  "zones": [
    {
      "id": "z_abc123",
      "name": "Casa",
      "type": "Casa",
      "address": "Calle 45 #12-10",
      "radius": "100 Metros"
    }
  ],
  "routes": [
    {
      "id": "r_abc123",
      "name": "Casa - Colegio",
      "start": "Casa",
      "end": "Colegio San Jose",
      "isActive": true
    }
  ]
}
```

### Notificación (objeto)
```json
{
  "id": "1746220800000",
  "studentId": "1234567890abc",
  "type": "Exitosas",
  "name": "María Pérez",
  "message": "María Pérez llegó a zona segura",
  "color": "#7BC74D",
  "time": "Ahora"
}
```

### Registro de Historial (objeto)
```json
{
  "id": "1746220800001",
  "studentId": "1234567890abc",
  "estudiante": "María Pérez",
  "fecha": "2 de mayo",
  "horaInicio": "7:30 AM",
  "horaFin": "--",
  "duracion": "--",
  "distancia": "--",
  "estado": "Completado",
  "alerta": false,
  "ruta": "Actualización Manual",
  "studentColor": "#7BC74D"
}
```

---

## Patrón de Datos Mock vs. Datos Reales

La app implementa un patrón híbrido:

```javascript
// En history.js — loadData()
const [studentData, storedHistory] = await Promise.all([
  getStudents(),      // ← Datos REALES de AsyncStorage
  getHistory()        // ← Datos REALES de AsyncStorage
]);

// Combinar reales + mock de demostración
let combined = [...storedHistory, ...MOCK_HISTORY];

// Generar datos de muestra para estudiantes sin historial
studentData.forEach(student => {
  if (!combined.find(h => h.estudiante === student.nombre)) {
    combined.push({
      id: `gen-${student.id}`,     // Prefijo 'gen-' identifica datos generados
      // ...datos placeholder
    });
  }
});
```

**¿Por qué este patrón?** Garantiza que la pantalla nunca se vea vacía, incluso en un primer uso sin datos reales. Los registros con `id.startsWith('gen-')` se tratan diferente al eliminar (se elimina solo de la UI, no de AsyncStorage).

---

## Diagrama de Dependencias entre Archivos

```
app/_layout.js
  ├── contexts/AuthContext.js
  ├── contexts/LanguageContext.js ── translations/index.js
  └── contexts/UserRoleContext.js

app/(tabs)/_layout.js
  ├── contexts/LanguageContext.js
  └── constants/colors.js

app/(tabs)/student.js
  ├── utils/studentStorage.js ── @react-native-async-storage
  ├── contexts/LanguageContext.js
  ├── constants/colors.js
  └── expo-image-picker

app/(tabs)/history.js
  ├── utils/studentStorage.js
  ├── components/SafeMap.js ── react-native-maps (móvil)
  ├── contexts/LanguageContext.js
  └── constants/colors.js

app/(auth)/login.js
  ├── services/auth.service.js ── utils/storage.js
  ├── hooks/useAuth.js
  └── contexts/AuthContext.js
```
