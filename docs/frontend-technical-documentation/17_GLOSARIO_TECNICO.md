# 📖 Glosario Técnico
## GPS Guardian Escolar

> Definición de los términos técnicos usados en el proyecto y su documentación. Útil para exposiciones académicas y para nuevos miembros del equipo sin experiencia en React Native.

---

## A

### AsyncStorage
Base de datos clave-valor **asíncrona** y **persistente** que corre en el dispositivo móvil. Similar al `localStorage` del navegador, pero diseñada para React Native. Los datos sobreviven al cierre de la app. Guarda cadenas de texto; para objetos complejos se usa `JSON.stringify()` al guardar y `JSON.parse()` al leer.

```javascript
// Guardar
await AsyncStorage.setItem('clave', JSON.stringify({ nombre: 'María' }));

// Leer
const raw = await AsyncStorage.getItem('clave');
const data = JSON.parse(raw); // { nombre: 'María' }
```

### API REST
*Application Programming Interface — Representational State Transfer*. Convención para que dos sistemas intercambien información a través de HTTP. Usa verbos HTTP estándar: `GET` (leer), `POST` (crear), `PUT` (actualizar), `DELETE` (eliminar). El backend de Guardian Escolar expone endpoints REST que el frontend consume con Axios.

### Axios
Librería JavaScript para hacer peticiones HTTP desde el cliente. Alternativa más robusta al `fetch` nativo del navegador. Permite configurar interceptores, timeouts y manejo centralizado de errores.

---

## B

### Bundle / Bundle Size
El "bundle" es el archivo JavaScript compilado que la app descarga y ejecuta. El "bundle size" es su tamaño en bytes. Un bundle más pequeño = carga más rápida. Las decisiones de no usar `i18next` o Redux se tomaron parcialmente para mantener el bundle pequeño.

### Bridge (React Native)
El mecanismo por el cual el código JavaScript de React Native se comunica con el código nativo (Java/Kotlin en Android, Objective-C/Swift en iOS). El Bridge es asíncrono — las operaciones nativas no bloquean el hilo JS. Por eso `useNativeDriver: true` en animaciones es importante: corre la animación del lado nativo sin cruzar el bridge.

---

## C

### camelCase
Convención de nomenclatura donde las palabras se concatenan y cada palabra después de la primera comienza con mayúscula: `backgroundColor`, `fontSize`, `useCallback`. React Native y JavaScript usan camelCase. CSS usa kebab-case (`background-color`, `font-size`).

### Context API (React)
Sistema de React para compartir estado entre componentes sin pasar props manualmente por cada nivel del árbol de componentes. Se implementa con `createContext()`, un Provider y el hook `useContext()`. Alternativa ligera a Redux para estado global no excesivamente complejo.

### Cloudflare Tunnel
Servicio de Cloudflare que crea un túnel seguro entre una URL pública (ej: `https://xyz.trycloudflare.com`) y un servidor local. Permite acceder al backend desde cualquier dispositivo sin configurar el router, puertos ni IP pública. Usado en el proyecto para conectar la app (móvil en la red local) al backend durante desarrollo.

---

## D

### Deep Linking
Capacidad de una app móvil de responder a URLs externas y navegar a una pantalla específica. Expo Router lo gestiona automáticamente basándose en la estructura de carpetas.

---

## E

### Expo
Plataforma construida sobre React Native que simplifica el acceso a APIs nativas del dispositivo (cámara, GPS, notificaciones) sin escribir código nativo en Java/Kotlin/Swift. Provee el servidor de desarrollo, el CLI y la app Expo Go para testing.

### Expo Go
App móvil gratuita disponible en App Store y Play Store que permite escanear un código QR y cargar cualquier proyecto Expo en el dispositivo físico sin necesidad de compilar o instalar la app. Usada durante el desarrollo para pruebas rápidas en móvil real.

### Expo Router
Sistema de enrutamiento de Expo basado en el sistema de archivos. Cada archivo en `app/` define automáticamente una ruta. Basado en React Navigation internamente, pero con una API declarativa más simple.

---

## F

### File-System Routing
Paradigma de navegación donde la **estructura de carpetas y archivos** define las rutas de la app, en vez de configurarlas manualmente en código. `app/(tabs)/history.js` → ruta `/history`. Popularizado por Next.js para web; Expo Router lo trae a React Native.

### Flexbox
Sistema de layout CSS (y React Native) para organizar elementos en filas y columnas. En React Native **todo usa Flexbox por defecto**, incluso sin declararlo. La dirección por defecto en RN es `column` (vertical), mientras en CSS es `row` (horizontal).

### Focus Effect
En navegación móvil, una pantalla puede quedar "montada" en memoria aunque no sea visible. `useFocusEffect` es un hook que ejecuta código **cada vez que la pantalla entra en foco** (el usuario navega hacia ella), no solo la primera vez que se monta.

---

## G

### GPS (Global Positioning System)
Sistema de satélites que permite determinar la posición geográfica de un dispositivo en coordenadas de latitud y longitud. En la app, `expo-location` accede al receptor GPS del teléfono para obtener la ubicación del padre, y el backend recibe las coordenadas del tracker GPS del estudiante.

---

## H

### Hook (React)
Función que permite a los componentes funcionales de React "engancharse" a funcionalidades de React como el estado (`useState`), efectos secundarios (`useEffect`) y contextos (`useContext`). Los hooks siempre empiezan con `use`. Los "Custom Hooks" son funciones propias que combinan hooks de React para encapsular lógica reutilizable.

### Hot Reload
Característica del servidor de desarrollo de Expo: cuando se guarda un archivo, los cambios aparecen en la app automáticamente en ~1-2 segundos **sin perder el estado de la aplicación**. Es diferente al "Full Reload" que reinicia la app completamente.

---

## I

### i18n
Abreviatura de "Internationalization" (18 letras entre la 'i' y la 'n'). El proceso de diseñar una app para que pueda adaptarse a diferentes idiomas y regiones sin reingeniería. En este proyecto se implementó con un diccionario JS + React Context.

### Interceptor (Axios)
Función que se ejecuta automáticamente **antes** de que una petición HTTP salga del cliente o **después** de que la respuesta llegue. Usada en el proyecto para adjuntar el token JWT a cada petición sin repetir el código en cada llamada a la API.

---

## J

### JWT (JSON Web Token)
Estándar abierto para crear tokens de acceso compactos y autocontenidos. Un JWT codifica información (ID de usuario, rol, expiración) en Base64 y está firmado digitalmente por el servidor. El cliente lo guarda y lo envía en cada petición como prueba de autenticación. Formato: `header.payload.signature`.

### JSX
Extensión de sintaxis de JavaScript que permite escribir estructuras similares a HTML dentro de código JS. `<View style={styles.container}>` es JSX. El compilador (Babel/Hermes) lo transforma a llamadas `React.createElement()`.

---

## K

### Keychain / Keystore
Sistema de almacenamiento seguro y cifrado del sistema operativo. **Keychain** en iOS, **Android Keystore** en Android. `expo-secure-store` usa estos sistemas para guardar el token JWT de sesión de forma que no pueda ser extraído aunque el dispositivo sea rooteado.

---

## L

### Latencia
El tiempo que transcurre entre que el cliente hace una petición y recibe la respuesta del servidor. Para GPS en tiempo real, una latencia de 2+ segundos es inaceptable, por eso se usan WebSockets (latencia ~50ms) en vez de HTTP polling.

---

## M

### Material Design 3 (M3)
Sistema de diseño de Google que define cómo deben verse y comportarse los elementos de interfaz (botones, tarjetas, tipografía, colores, animaciones) para ser consistentes, accesibles y modernos. `react-native-paper` implementa M3 para React Native.

### Metro Bundler
El compilador (bundler) JavaScript que usa React Native/Expo. Convierte los archivos `.js`/`.ts` del proyecto en un bundle optimizado que el dispositivo puede ejecutar. Corre en segundo plano al ejecutar `npx expo start`.

### Mock / Mock Data
Datos o servicios **simulados** usados durante el desarrollo cuando el sistema real (backend, base de datos) no está disponible. El `authService` del proyecto es un mock — simula un servidor de autenticación usando AsyncStorage local.

---

## N

### Native Driver
En React Native, la mayoría del código corre en el hilo JavaScript. Las animaciones que usan `useNativeDriver: true` transfieren el control de la animación al **hilo nativo de UI**, que corre independientemente. Resultado: animaciones a 60fps aunque el hilo JS esté ocupado.

### Nullish Coalescing (`??`)
Operador de JavaScript que devuelve el operando derecho si el izquierdo es `null` o `undefined`. Diferente a `||` que también evalúa como falsy `0`, `''` y `false`. Usado en `t(key)` para el fallback de traducción: `translations[lang]?.[key] ?? translations['es']?.[key] ?? key`.

---

## O

### Optional Chaining (`?.`)
Operador de JavaScript que permite acceder a propiedades anidadas sin lanzar error si algún nivel intermedio es `null`/`undefined`. `translations[lang]?.[key]` devuelve `undefined` en vez de lanzar `TypeError: Cannot read properties of undefined`.

---

## P

### Platform (React Native)
Módulo de React Native que provee información sobre la plataforma actual: `Platform.OS` devuelve `'ios'`, `'android'` o `'web'`. Permite escribir código condicional por plataforma sin duplicar componentes.

### Prop Drilling
Anti-patrón en React donde se pasan props a través de múltiples niveles de componentes que no los usan directamente, solo para que lleguen a un componente profundo. La Context API es la solución estándar al prop drilling.

### Promise
Objeto de JavaScript que representa la eventual resolución (éxito) o rechazo (fallo) de una operación asíncrona. `async/await` es azúcar sintáctica sobre Promises. Toda operación de AsyncStorage y las peticiones HTTP retornan Promises.

---

## R

### React Native
Framework de Meta (Facebook) para construir aplicaciones móviles nativas (Android/iOS) usando JavaScript y React. A diferencia de aplicaciones híbridas (WebView), React Native renderiza componentes UI nativos del sistema operativo, dando una experiencia indistinguible de una app nativa.

### react-native-web
Librería que implementa la misma API de React Native pero renderizando en el DOM del navegador. Permite que el mismo código `.js` funcione en Android, iOS Y navegadores web. Los componentes se "traducen": `<View>` → `<div>`, `<Text>` → `<span>`, etc.

### Repository Pattern
Patrón de diseño que abstrae la capa de acceso a datos detrás de una interfaz. En el proyecto, `studentStorage.js` es el repositorio de estudiantes — la UI solo conoce `addStudent()`, `getStudents()`, etc., sin saber si los datos vienen de AsyncStorage, una API o SQLite.

---

## S

### Safe Area
En dispositivos modernos (especialmente iPhone con notch/Dynamic Island y Android con gestos en la barra inferior), hay áreas de la pantalla que quedan físicamente oscurecidas o inaccesibles al tacto. `react-native-safe-area-context` provee el inset necesario para que el contenido no quede oculto.

### SecureStore (expo-secure-store)
API de Expo que guarda datos en el almacenamiento cifrado del SO (Keychain en iOS, Keystore en Android). Los datos en SecureStore no pueden ser leídos sin autenticación biométrica o del sistema, a diferencia de AsyncStorage que no está cifrado.

### StyleSheet.create()
API de React Native para definir estilos. Similar a CSS pero en JavaScript, con camelCase y sin unidades en los valores numéricos. `StyleSheet.create()` valida los estilos en desarrollo y los optimiza (convierte a IDs numéricos) en producción.

### STOMP
*Simple Text Oriented Message Protocol*. Protocolo de mensajería que corre sobre WebSocket. Define un formato estándar para suscribirse a "tópicos" y enviar/recibir mensajes. El backend Spring Boot expone un servidor STOMP para el GPS en tiempo real.

---

## T

### Token (JWT)
Ver **JWT**. En el proyecto, el token es un string que el servidor genera al hacer login. El cliente lo guarda en SecureStore y lo envía en el header `Authorization: Bearer <token>` en cada petición HTTP para demostrar identidad.

### TypeScript
Superset de JavaScript que añade tipos estáticos. Permite detectar errores en tiempo de compilación en vez de en tiempo de ejecución. El proyecto usa `tsconfig.json` pero los archivos son `.js` — TypeScript se usa en modo laxo para compatibilidad.

---

## U

### `useCallback`
Hook de React que memoiza (cachea) una función. La función solo se recrea si sus dependencias cambian. Usado en el proyecto para `t()` (la función de traducción) y `setLanguage()` para evitar que se recreen en cada render y disparen re-renders innecesarios.

### `useEffect`
Hook de React para ejecutar efectos secundarios (cargar datos, suscripciones, timers) después de que el componente renderiza. Recibe una función y un array de dependencias. Array vacío `[]` = ejecutar solo una vez al montar.

### `useFocusEffect`
Hook de Expo Router que ejecuta código cada vez que la pantalla entra en foco (el usuario navega hacia ella). Equivale a `useEffect` pero sensible a la navegación, no solo al montaje del componente.

---

## W

### WebSocket
Protocolo de comunicación que mantiene una conexión persistente bidireccional entre cliente y servidor. A diferencia de HTTP donde el cliente siempre inicia, con WebSocket el servidor puede enviar datos en cualquier momento. Ideal para GPS en tiempo real.

### `useNativeDriver`
Propiedad de las animaciones de React Native. Cuando es `true`, transfiere la animación al hilo nativo de UI (fuera del hilo JS), garantizando 60fps independientemente de la carga del código JavaScript.
