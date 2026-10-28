# 🚀 Guía de Configuración y Despliegue
## GPS Guardian Escolar

> Todo lo necesario para levantar el proyecto en un entorno de desarrollo desde cero, conectarlo al backend y ejecutarlo en web y móvil.

---

## Requisitos Previos

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 18.x o superior | `node --version` |
| npm | 9.x o superior | `npm --version` |
| Expo Go (móvil) | Última | App Store / Play Store |
| Git | Cualquier reciente | `git --version` |

> **No se requiere** Android Studio, Xcode ni ningún SDK nativo para ejecutar en modo desarrollo con Expo Go.

---

## Instalación desde Cero

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd "Fronted-Guardian-Escolar"

# 2. Instalar dependencias (puede tardar 2-5 minutos la primera vez)
npm install

# 3. Crear el archivo de variables de entorno
# (Crear el archivo .env en la raíz del proyecto)
```

### Configurar el archivo `.env`

```bash
# .env — Variables de entorno (NO subir a Git)
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080
EXPO_PUBLIC_WS_URL=ws://192.168.1.100:8080/ws
```

> Reemplazar `192.168.1.100` con la IP de la máquina donde corre el backend.
> Para conexión remota, usar una URL de Cloudflare Tunnel:
> `EXPO_PUBLIC_API_URL=https://xxxx.trycloudflare.com`

---

## Comandos de Ejecución

```bash
# Modo desarrollo (con hot reload) — COMANDO PRINCIPAL
npx expo start

# Con caché limpia (usar cuando haya cambios en assets o configuración)
npx expo start -c

# Solo en navegador web
npx expo start --web

# Solo en Android
npx expo start --android

# Solo en iOS
npx expo start --ios
```

### Teclas en el Terminal de Expo

| Tecla | Acción |
|---|---|
| `w` | Abrir en navegador web |
| `a` | Abrir en emulador Android |
| `i` | Abrir en simulador iOS (solo macOS) |
| `r` | Recargar la app |
| `Shift + R` | Recargar borrando caché |
| `m` | Abrir menú de dev tools |
| `j` | Abrir React DevTools |

---

## Conexión desde Móvil Físico

1. El PC y el teléfono deben estar en la **misma red WiFi**.
2. Ejecutar `npx expo start -c`.
3. Abrir **Expo Go** en el teléfono.
4. Escanear el **código QR** que aparece en el terminal.

Si hay problemas de conexión (redes empresariales, firewall):
```bash
# Usar tunnel de Expo (requiere @expo/ngrok instalado)
npx expo start --tunnel
```

---

## Conectar con el Backend vía Cloudflare Tunnel

Si el backend corre en una máquina diferente o se necesita acceso externo:

```bash
# En la máquina del backend
cloudflared tunnel --url http://localhost:8080

# Cloudflare dará una URL del tipo:
# https://random-words-here.trycloudflare.com

# Actualizar el .env del frontend
EXPO_PUBLIC_API_URL=https://random-words-here.trycloudflare.com
EXPO_PUBLIC_WS_URL=wss://random-words-here.trycloudflare.com/ws
```

Luego reiniciar Expo con `npx expo start -c`.

---

## Solución de Problemas Comunes

### El mapa no aparece en móvil Android
```
Causa: Falta la Google Maps API Key en app.json
Solución: Agregar en app.json → android.config.googleMaps.apiKey
```

### "Cannot find module" al arrancar
```bash
# Limpiar e instalar de nuevo
rm -rf node_modules
npm install
npx expo start -c
```

### Cambios no se reflejan en el móvil
```
1. En el terminal, presionar Shift + R
2. Si persiste: cerrar Expo Go completamente y reabrir
3. Si persiste: npx expo start -c (caché limpia del servidor)
```

### Error "Metro bundler crashed"
```bash
# Matar procesos de Node y reiniciar
npx expo start -c
```

### La app en móvil muestra textos en español aunque esté en inglés
```
Causa: AsyncStorage tiene el idioma cacheado de una versión anterior
Solución: Ir a Perfil → cambiar idioma a Inglés y guardar
O: Desinstalar Expo Go y volver a instalar (limpia el AsyncStorage)
```

---

## Variables de Entorno — Referencia Completa

| Variable | Ejemplo | Descripción |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://192.168.1.5:8080` | URL base del backend REST |
| `EXPO_PUBLIC_WS_URL` | `ws://192.168.1.5:8080/ws` | URL del servidor WebSocket |

> **Nota `EXPO_PUBLIC_`:** Expo requiere este prefijo para que las variables sean accesibles en el código del cliente. Variables sin este prefijo solo están disponibles en scripts de build.

---

## Scripts de `package.json`

```json
{
  "scripts": {
    "start":         "expo start",
    "android":       "expo start --android",
    "ios":           "expo start --ios",
    "web":           "expo start --web",
    "reset-project": "node ./scripts/reset-project.js",
    "lint":          "expo lint"
  }
}
```

### `reset-project`
Ejecuta el script de reinicio que limpia datos de Expo y regenera la configuración. **Usar con precaución** — puede requerir reinstalar dependencias.

---

## Estructura del `app.json` — Configuración de Expo

```json
{
  "expo": {
    "name": "GPS Guardian Escolar",
    "slug": "gps-guardian-escolar",
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"],
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "backgroundColor": "#1A4F8A"      ← Color primario de la marca
    },
    "ios": {
      "bundleIdentifier": "com.guardian.escolar",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Necesitamos tu ubicación para el seguimiento"
      }
    },
    "android": {
      "package": "com.guardian.escolar",
      "permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

---

## Convenciones de Código del Proyecto

### Organización de un Archivo de Pantalla

```javascript
// 1. Imports de librerías externas
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Imports internos del proyecto
import { COLORS } from '../../constants/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { getStudents } from '../../utils/studentStorage';

// 3. Constantes del módulo
const MOCK_DATA = [...];

// 4. Componente principal (export default)
export default function ScreenName() {
  const { t } = useLanguage();
  const [data, setData] = useState([]);

  // Hooks de ciclo de vida
  useFocusEffect(useCallback(() => { loadData(); }, []));

  // Funciones del módulo
  async function loadData() { ... }
  function handleAction() { ... }

  // Render
  return ( <View>...</View> );
}

// 5. Sub-componentes locales (si aplica)
function LocalCard({ item }) { ... }

// 6. Estilos al final del archivo
const styles = StyleSheet.create({ ... });
```

### Naming Conventions

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componente React | PascalCase | `StudentCard`, `HistoryScreen` |
| Hook personalizado | camelCase con `use` | `useAuth`, `useTracking` |
| Función de utilidad | camelCase | `getStudents`, `formatDate` |
| Constante global | UPPER_SNAKE_CASE | `COLORS.PRIMARIO`, `STORAGE_KEY` |
| Archivo de pantalla | kebab-case | `forgot-password.js`, `student.js` |
| Clave de AsyncStorage | `@scope_nombre` | `@guardian_estudiantes` |
| Clave de traducción | camelCase con prefijo | `histTitle`, `studEmpty` |
