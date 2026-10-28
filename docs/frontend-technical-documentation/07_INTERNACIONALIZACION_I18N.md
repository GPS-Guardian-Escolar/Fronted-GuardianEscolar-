# 🌐 Internacionalización (i18n) — Sistema Bilingüe ES / EN
## GPS Guardian Escolar

> **¿Por qué importa?** Una app de uso familiar en Colombia debe poder cambiar de idioma de forma fluida, sin recargar, sin perder estado, y con soporte de fallback robusto. Esta sección documenta la implementación completa del sistema de traducción adoptado.

---

## Decisiones de Diseño

### ¿Por qué no `i18next` o `react-intl`?

Librerías populares de i18n como `i18next` son potentes pero añaden complejidad de configuración y peso al bundle que no se justifica para una aplicación con **2 idiomas y un diccionario estático**. Se optó por una solución propia con `React Context` + `AsyncStorage` que ofrece:

- **Cero dependencias adicionales** para i18n.
- **Persistencia automática** del idioma elegido entre sesiones.
- **Fallback garantizado**: si una clave no tiene traducción en inglés, muestra el español en vez de romper la UI.
- **API mínima** e idéntica en toda la app: una sola función `t('clave')`.

---

## Arquitectura del Sistema

```
translations/index.js          ← Diccionario de textos (fuente única de verdad)
        ↓
contexts/LanguageContext.js    ← Provider global que expone t() y setLanguage()
        ↓
app/_layout.js                 ← Envuelve TODA la app con <LanguageProvider>
        ↓
Cualquier pantalla             ← const { t, lang, setLanguage } = useLanguage();
```

---

## 1. El Diccionario — `translations/index.js`

Es la **única fuente de verdad** de todos los textos de la aplicación. Exporta un objeto con un sub-objeto por idioma:

```javascript
export const translations = {
  es: {
    histTitle: 'Historial de Trayectos',
    histCompleted: 'Completado',
    // ... +200 claves
  },
  en: {
    histTitle: 'Journey History',
    histCompleted: 'Completed',
    // ... +200 claves (mismas claves, distintos valores)
  },
  fr: { _comingSoon: true },   // Reservado, no disponible aún
  pt: { _comingSoon: true },
};
```

### Convención de Nombres de Claves

Las claves siguen el patrón `[módulo][Descriptor]` en camelCase:

| Prefijo | Módulo |
|---|---|
| `hist*` | Historial (history.js) |
| `notif*` | Notificaciones (notifications.js) |
| `stud*` | Estudiantes (student.js) |
| `track*` | Seguimiento (tracking.js) |
| `zones*` | Zonas (zones.js) |
| `auth*` | Autenticación (login, register, etc.) |
| `profile*` | Perfil (profile.js) |
| `dash*` | Dashboard (index.js) |
| `nav*` / `tab*` | Navegación y menús |
| `lang*` | Modal de selección de idioma |

---

## 2. El Contexto — `contexts/LanguageContext.js`

Este archivo es el corazón del sistema. Analicemos su código completo:

```javascript
import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../translations';

// Clave usada para persistir la preferencia en el dispositivo
const LANG_KEY = '@guardian_language';

// Contexto con valores por defecto (protege contra uso fuera del Provider)
const LanguageContext = createContext({
  lang: 'es',
  t: (key) => key,          // Fallback: devuelve la clave tal cual
  setLanguage: () => {},
});
```

### `LanguageProvider` — El Proveedor

```javascript
export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('es');   // Estado interno del idioma activo

  // Al montar el componente, lee el idioma guardado del dispositivo
  React.useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved && translations[saved]) {
        setLang(saved);   // Restaura el idioma de la sesión anterior
      }
    });
  }, []);
```

> **Punto clave:** El idioma se **persiste** entre sesiones. Si el usuario cierra la app y la vuelve a abrir, el idioma seleccionado se restaura automáticamente desde `AsyncStorage`.

### `setLanguage` — Cambiar de Idioma

```javascript
  const setLanguage = useCallback(async (code) => {
    // Doble validación: el código existe Y el idioma no está marcado como "próximamente"
    if (translations[code] && !translations[code]._comingSoon) {
      setLang(code);                                    // Actualiza el estado React
      await AsyncStorage.setItem(LANG_KEY, code);       // Persiste en el dispositivo
    }
  }, []);
```

> **Seguridad:** Si alguien intenta activar `fr` o `pt` (que tienen `_comingSoon: true`), la función lo bloquea silenciosamente. Nunca se rompe la UI.

### `t()` — La Función de Traducción

```javascript
  const t = useCallback((key) => {
    return translations[lang]?.[key]      // 1. Busca en el idioma activo
        ?? translations['es']?.[key]      // 2. Fallback al español si no existe
        ?? key;                           // 3. Último recurso: devuelve la clave misma
  }, [lang]);
```

**Esta triple validación garantiza que la app nunca muestre `undefined` ni se rompa**, sin importar si una clave falta en una traducción.

---

## 3. Integración en el Árbol de Componentes — `app/_layout.js`

Para que `t()` esté disponible en **toda** la app, `LanguageProvider` envuelve el componente raíz:

```javascript
export default function RootLayout() {
  return (
    <LanguageProvider>         {/* ← i18n disponible en toda la app */}
      <AuthProvider>
        <Stack>
          ...
        </Stack>
      </AuthProvider>
    </LanguageProvider>
  );
}
```

---

## 4. Uso en Pantallas — El Hook `useLanguage()`

En cualquier componente o pantalla de la app:

```javascript
import { useLanguage } from '../../contexts/LanguageContext';

export default function HistoryScreen() {
  const { t, lang, setLanguage } = useLanguage();
  //       │    │        └─ Función para cambiar idioma
  //       │    └─ Código del idioma activo: 'es' | 'en'
  //       └─ Función de traducción

  return (
    <Text>{t('histTitle')}</Text>
    // → Español: "Historial de Trayectos"
    // → Inglés:  "Journey History"
  );
}
```

---

## 5. El Selector de Idioma en el Header

El cambio de idioma es accesible desde el botón 🌐 en la barra superior de **todas las pantallas** del menú principal.

```
Flujo del selector:
Usuario toca 🌐 → Modal con lista de idiomas → Selecciona "English" → 
Toca "Apply" → setLanguage('en') → useState actualiza → 
useCallback recalcula t() → TODA la UI se re-renderiza en inglés
```

Esta re-renderización masiva ocurre porque React Context notifica a **todos los suscriptores** del cambio de estado, y todos los componentes que usan `useLanguage()` se actualizan automáticamente.

---

## 6. Manejo de Textos con Formato Dinámico

Para textos que mezclan traducción con valores en tiempo real, se usan template literals:

```javascript
// En notifications.js
message: `${student.nombre} ${t('studSafeZone')}`
// → "María Pérez In Safe Zone"
// → "María Pérez En Zona Segura"
```

Para fechas generadas dinámicamente (que el sistema operativo devuelve en español en dispositivos Android/iOS en español), se aplican reemplazos en el momento de renderizar:

```javascript
// En history.js — traducir fechas generadas por toLocaleDateString()
{t('live') === 'Live'
  ? fecha
      .replace(/\s+de\s+/gi, ' ')           // "2 de mayo" → "2 mayo"
      .replace(/mayo/gi, 'May')             // "2 mayo" → "2 May"
      .replace(/hoy/gi, t('today'))         // "Hoy" → "Today"
  : fecha}
```

> **¿Por qué este enfoque?** `toLocaleDateString()` usa la configuración del **sistema operativo**, no la de la app. Un dispositivo en español siempre devolverá "2 de mayo", independientemente del idioma de la app. Por eso se hace la traducción en el momento de renderizar.

---

## 7. Cómo Agregar un Nuevo Idioma

Para agregar, por ejemplo, **Francés**:

**Paso 1:** En `translations/index.js`, cambiar el marcador:
```javascript
fr: { _comingSoon: true },   // antes
fr: {                        // después
  appName: 'GPS Guardian Scolaire',
  histTitle: 'Historique des Trajets',
  // ... resto de claves
},
```

**Paso 2:** En `SUPPORTED_LANGUAGES`:
```javascript
{ code: 'fr', label: 'Français', flag: '🇫🇷', available: true },  // cambiar a true
```

**Paso 3:** No se requiere ningún otro cambio. El sistema lo detecta y lo activa automáticamente.

---

## Resumen de Archivos Involucrados

| Archivo | Rol en el sistema i18n |
|---|---|
| `translations/index.js` | Diccionario de textos (fuente única) |
| `contexts/LanguageContext.js` | Provider, estado, persistencia y función `t()` |
| `app/_layout.js` | Envuelve la app con `<LanguageProvider>` |
| `app/(tabs)/_layout.js` | Selector de idioma (modal del header) |
| `utils/storage.js` | AsyncStorage subyacente para persistir el código de idioma |
| Cada `*.js` de pantalla | Consumidor del hook `useLanguage()` |
