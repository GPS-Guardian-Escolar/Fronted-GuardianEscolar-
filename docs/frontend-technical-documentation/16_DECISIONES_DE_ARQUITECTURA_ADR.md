# 📋 Registro de Decisiones de Arquitectura (ADR)
## GPS Guardian Escolar

> Un ADR (Architecture Decision Record) documenta **por qué** se tomó una decisión técnica importante, qué alternativas se evaluaron y cuáles son las consecuencias. Es el documento más valioso para mantener el proyecto a largo plazo.

---

## ADR-001: Expo Router sobre React Navigation puro

**Estado:** ✅ Adoptado  
**Fecha:** Fase inicial del proyecto  
**Contexto:** El proyecto necesitaba un sistema de navegación para gestionar el flujo auth → tabs y la barra de menú inferior.

**Decisión:** Usar **Expo Router** (file-system routing) en vez de React Navigation con rutas declaradas manualmente.

**Alternativas evaluadas:**

| Alternativa | Por qué se descartó |
|---|---|
| React Navigation puro | Requiere declarar cada ruta manualmente. Con 12+ pantallas, el archivo de configuración se vuelve un punto de falla central. |
| React Navigation + estructura manual | Más flexible pero sin convención de estructura de carpetas. Dificulta incorporar nuevos desarrolladores. |
| **Expo Router** ✅ | Convención sobre configuración. La estructura de carpetas ES la definición de rutas. Menor código de bootstrap. |

**Consecuencias positivas:** Onboarding más rápido. La estructura de `app/` es autoexplicativa. Deep linking gratuito.  
**Consecuencias negativas:** Transiciones personalizadas requieren más configuración que con React Navigation manual. La versión es canary (no estable).

---

## ADR-002: AsyncStorage sobre SQLite/Realm para Datos Locales

**Estado:** ✅ Adoptado  
**Fecha:** Fase inicial del proyecto  
**Contexto:** La app necesita persistir listas de estudiantes, historial y notificaciones localmente en el dispositivo.

**Decisión:** Usar **AsyncStorage** con JSON serializado.

**Alternativas evaluadas:**

| Alternativa | Por qué se descartó |
|---|---|
| SQLite (expo-sqlite) | Overkill para el volumen de datos (< 100 registros por colección). Requiere conocer SQL. Mayor complejidad de setup. |
| Realm (MongoDB) | Excelente para datos relacionales complejos. Dependencia grande. La relación student↔history se puede manejar con IDs en JSON. |
| WatermelonDB | Alta performance para miles de registros. Innecesario para este caso de uso. |
| **AsyncStorage** ✅ | Simple, integrado con Expo, cero configuración. Suficiente para el volumen actual (máx. 50 registros por colección). |

**Consecuencias positivas:** Setup en minutos. API simple (get/set con JSON). Familiaridad del equipo.  
**Consecuencias negativas:** No hay queries complejas (filtros se hacen en JS). Sin transacciones ACID. No escala bien si los registros superan los miles.

**Criterio de reevaluación:** Si la app necesita almacenar >1000 registros o queries complejas, migrar a `expo-sqlite`.

---

## ADR-003: Sistema i18n Propio sobre librerías Establecidas

**Estado:** ✅ Adoptado  
**Fecha:** Fase de internacionalización  
**Contexto:** La app necesita soporte bilingüe ES/EN con persistencia de la preferencia del usuario.

**Decisión:** Implementar un sistema i18n **propio** basado en React Context + diccionario JS.

**Alternativas evaluadas:**

| Alternativa | Por qué se descartó |
|---|---|
| `i18next` + `react-i18next` | Potente y estándar en la industria. Para solo 2 idiomas con diccionario estático, añade ~100KB al bundle y complejidad de configuración. |
| `react-intl` (FormatJS) | Excelente para plurales y formatos de fecha/número complejos. Para textos simples, es excesivo. |
| `expo-localization` + diccionario | Detecta el idioma del sistema automáticamente. No permite cambio in-app. |
| **Solución propia** ✅ | Cero dependencias. Control total. API mínima: una función `t('key')`. Fallback de 3 niveles. Persistencia con AsyncStorage. |

**Consecuencias positivas:** Bundle más liviano. Sin curva de aprendizaje de librería externa. Fácil de extender.  
**Consecuencias negativas:** Sin soporte automático de plurales (ej: "1 hij@ / 2 hij@s"). Sin formatos de fecha/moneda automáticos. Mantenimiento manual.

---

## ADR-004: Mock Local para Autenticación en Desarrollo

**Estado:** ✅ Adoptado (temporal)  
**Fecha:** Fase de desarrollo paralelo backend/frontend  
**Contexto:** El frontend y el backend se desarrollan en paralelo. Esperar al backend para implementar la UI de autenticación bloquearía el progreso.

**Decisión:** Implementar un **servicio de autenticación mock** que almacena cuentas en AsyncStorage local, con la misma interfaz que tendrá el servicio real.

```javascript
// La interfaz es idéntica entre mock y producción:
authService.login(email, password)     → Promise<{ token, user }>
authService.register(userData)         → Promise<{ success, user }>
authService.logout()                   → Promise<void>
```

**Consecuencias positivas:** Frontend completamente funcional sin backend. La migración al servicio real solo requiere cambiar la implementación interna del servicio — la UI no cambia.  
**Consecuencias negativas:** Contraseñas almacenadas en texto plano en AsyncStorage (solo válido en desarrollo). Las cuentas no persisten entre dispositivos.

**Plan de migración a producción:**
```javascript
// Cambiar en auth.service.js:
// DE: lógica con AsyncStorage local
// A:  llamadas a la API REST del backend
login: async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}
```

---

## ADR-005: `StyleSheet.create()` en cada Archivo vs. Sistema de Tema Centralizado

**Estado:** ✅ Adoptado  
**Fecha:** Inicio del proyecto  
**Contexto:** ¿Cómo centralizar los estilos para que cambios de diseño sean consistentes en toda la app?

**Decisión:** `StyleSheet.create()` **por archivo** + `constants/colors.js` como única fuente de verdad para colores.

**Alternativas evaluadas:**

| Alternativa | Por qué se descartó |
|---|---|
| Hoja de estilos global | En React Native, los estilos globales tienen menos performance que los locales (no pueden optimizarse por componente). |
| `styled-components` para RN | Permite CSS-in-JS con template literals. Añade abstracción innecesaria. El equipo prefiere StyleSheet nativo. |
| Sistema de tema de Paper (`PaperProvider`) | Útil para theming de componentes Paper. Adoptado parcialmente, pero los estilos custom siguen siendo locales. |
| **StyleSheet por archivo + colors.js** ✅ | Balance óptimo: colores centralizados (fácil de cambiar), estilos locales (mejor performance, co-ubicados con el componente). |

**Consecuencias positivas:** Los estilos están junto al componente que los usa (fácil de encontrar). React Native puede optimizar los IDs de StyleSheet.  
**Consecuencias negativas:** Algunos estilos se repiten entre archivos (ej: `cardStyle` similar en 5 pantallas). Trade-off aceptable.

---

## ADR-006: `SafeMap.js` como Capa de Abstracción del Mapa

**Estado:** ✅ Adoptado  
**Fecha:** Al descubrir que `react-native-maps` no funciona en web  
**Contexto:** `react-native-maps` falla en tiempo de ejecución en navegadores web. La app debe funcionar en las 3 plataformas.

**Decisión:** Crear un componente wrapper `SafeMap.js` que selecciona la implementación según `Platform.OS`.

**Alternativas evaluadas:**

| Alternativa | Por qué se descartó |
|---|---|
| Solo soportar móvil | El equipo requiere funcionamiento en web para demos y acceso desde computadores. |
| Leaflet.js para web | Requiere condicional de importación complejo y dos APIs completamente distintas. |
| Google Maps Web API directamente | Requiere `<WebView>` en móvil, que tiene peor performance que el mapa nativo. |
| **SafeMap.js** ✅ | Una sola API para todas las plataformas. La implementación varía internamente. Transparente para los consumidores. |

**Consecuencias positivas:** Los consumidores (`tracking.js`, `zones.js`) no saben que el mapa es diferente en web.  
**Consecuencias negativas:** El mapa web es una simulación visual, no un mapa real. Funcionalidad de zoom/pan no disponible en web.

---

## ADR-007: `useFocusEffect` para Recarga de Datos vs. Estado Global (Redux/Zustand)

**Estado:** ✅ Adoptado  
**Fecha:** Al implementar el flujo de agregar estudiante → ver historial  
**Contexto:** Cuando el usuario agrega un estudiante en la pantalla de Students y luego navega a History, History necesita mostrar los datos actualizados.

**Decisión:** Usar `useFocusEffect` para recargar datos desde AsyncStorage cada vez que una pantalla entra en foco.

**Alternativas evaluadas:**

| Alternativa | Por qué se descartó |
|---|---|
| Redux / Redux Toolkit | Excelente para estado complejo y tiempo real. Para esta app, añade ~50KB y boilerplate significativo (actions, reducers, selectors). |
| Zustand | Más simple que Redux. Aún así, añade una dependencia y un nivel de abstracción para un problema que `useFocusEffect` resuelve elegantemente. |
| React Query | Ideal para datos del servidor con caché y sincronización. Para AsyncStorage local, es excesivo. |
| **`useFocusEffect`** ✅ | Nativo de Expo Router. Cero dependencias adicionales. Los datos de AsyncStorage son la fuente de verdad, y se leen al entrar a cada pantalla. |

**Consecuencias positivas:** Simplicidad. Siempre datos frescos. Sin sincronización de estado.  
**Consecuencias negativas:** Lectura de AsyncStorage en cada foco (generalmente < 20ms, aceptable). Si los datos fueran del servidor, habría demasiados requests.
