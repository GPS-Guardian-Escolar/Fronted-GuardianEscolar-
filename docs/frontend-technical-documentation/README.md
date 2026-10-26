# 📚 Documentación Técnica Completa
## GPS Guardian Escolar — Frontend

> **Versión:** 1.0.0 | **Stack:** React Native 0.83 + Expo Router 55 | **Plataformas:** Android · iOS · Web

---

## Índice Completo (17 documentos)

### 📐 Arquitectura y Estructura
| # | Documento | Descripción |
|---|---|---|
| 01 | [Estructura General](./01_ESTRUCTURA_GENERAL.md) | Árbol de carpetas, convenciones y stack tecnológico |
| 06 | [Explicación General del Proyecto](./06_EXPLICACION_GENERAL_DEL_PROYECTO.md) | Visión global: qué es, para quién, arquitectura y estado actual |
| 10 | [Flujo de Datos y Estado](./10_FLUJO_DE_DATOS_Y_ESTADO.md) | Cómo viajan los datos, patrones AsyncStorage y diagramas de flujo |
| 15 | [Patrones de Diseño](./15_PATRONES_DE_DISENO.md) | Provider, Repository, Custom Hook, Guard y más — con código real |
| 16 | [Decisiones de Arquitectura (ADR)](./16_DECISIONES_DE_ARQUITECTURA_ADR.md) | Por qué se tomó cada decisión técnica y qué alternativas se descartaron |

### 📱 Pantallas y Componentes
| # | Documento | Descripción |
|---|---|---|
| 02 | [Carpeta `app/`](./02_CARPETA_APP.md) | Todas las pantallas: flujo auth y menú principal, archivo por archivo |
| 03 | [Carpeta `components/`](./03_CARPETA_COMPONENTS.md) | Componentes reutilizables de UI: botones, mapa, avatares |
| 04 | [Carpetas del Sistema](./04_CARPETAS_DEL_SISTEMA.md) | `contexts/`, `hooks/`, `services/`, `utils/`, `translations/`, `assets/` |

### 🎨 Diseño Visual
| # | Documento | Descripción |
|---|---|---|
| 05 | [Colores y Funcionalidades](./05_COLORES_Y_FUNCIONALIDADES.md) | Paleta de colores oficial y catálogo completo de funcionalidades |
| 08 | [Estilos: ¿Por qué no CSS ni HTML?](./08_ESTILOS_POR_QUE_NO_CSS_NI_HTML.md) | Por qué React Native usa JS para estilos y qué reemplaza al HTML/CSS |

### ⚙️ Sistemas Internos
| # | Documento | Descripción |
|---|---|---|
| 07 | [Internacionalización i18n](./07_INTERNACIONALIZACION_I18N.md) | Implementación del sistema bilingüe ES/EN paso a paso con código |
| 09 | [Dependencias](./09_DEPENDENCIAS.md) | Análisis técnico de cada librería: justificación y uso real |
| 11 | [Navegación — Expo Router](./11_NAVEGACION_EXPO_ROUTER.md) | File-system routing, grupos de rutas, guards y Stack vs Tab |
| 12 | [Autenticación y Seguridad](./12_AUTENTICACION_Y_SEGURIDAD.md) | Flujo de auth, 2FA, SecureStore y guard de rutas |
| 14 | [GPS y Tiempo Real](./14_GPS_Y_TIEMPO_REAL.md) | SafeMap web/móvil, WebSocket STOMP, animación LIVE, `expo-location` |



### 🚧 Limitaciones y Pendientes (Por Backend)
> El frontend está finalizado, pero estas áreas requieren que el servidor y base de datos estén listos.
| # | Documento | Descripción |
|---|---|---|
| 01 | [Limitaciones Actuales](./NO_SE_HA_HECHO/01_LIMITACIONES_ACTUALES.md) | Cascarón inteligente vs Persistencia centralizada |
| 02 | [Base de Datos y Datos Mock](./NO_SE_HA_HECHO/02_DATOS_MOCK_Y_BD.md) | Qué se está simulando hoy y cómo migrará a PostgreSQL |
| 03 | [Notificaciones y GPS Real](./NO_SE_HA_HECHO/03_NOTIFICACIONES_Y_GPS_REAL.md) | Por qué no hay alertas Push ni marcadores reales aún |
| 04 | [Almacenamiento de Imágenes](./NO_SE_HA_HECHO/04_ALMACENAMIENTO_DE_IMAGENES.md) | Uso de rutas `file://` locales vs Cloud Storage (AWS S3) |
| 05 | [Roles y Panel Administrativo](./NO_SE_HA_HECHO/05_ROLES_Y_PANEL_ADMINISTRATIVO.md) | Por qué la seguridad y la vista del colegio dependen de la BD |
| 06 | [Integración Hardware IoT](./NO_SE_HA_HECHO/06_INTEGRACION_HARDWARE_IOT.md) | Conexión de rastreadores físicos, protocolos MQTT y NMEA |

### 🚀 Operación y Referencia
| # | Documento | Descripción |
|---|---|---|
| 13 | [Configuración y Despliegue](./13_CONFIGURACION_Y_DESPLIEGUE.md) | Setup desde cero, variables de entorno y convenciones de código |
| 18 | [Flujo de Trabajo Git](./18_FLUJO_DE_TRABAJO_GIT.md) | Estrategia de ramas profesionales (dev, qa, staging, main) y manejo de errores |
| 17 | [Glosario Técnico](./17_GLOSARIO_TECNICO.md) | Definición de todos los términos técnicos del proyecto (A-W) |


## Rutas de Lectura Recomendadas

### 🎓 Exposición Académica
> Responde las preguntas más frecuentes de jurados y profesores.
```
06 → Qué es el proyecto y por qué existe
08 → Por qué JS en vez de HTML/CSS  ← la pregunta más frecuente
07 → El sistema bilingüe ES/EN y cómo funciona
05 → Colores, identidad visual y funcionalidades
12 → Autenticación y seguridad
16 → Por qué se tomaron las decisiones técnicas clave
17 → Glosario para dominar los términos técnicos
```

### 👨‍💻 Desarrollador que se Incorpora al Equipo
```
01 → Estructura de carpetas  
13 → Cómo ejecutar el proyecto  
09 → Dependencias y por qué se eligieron
10 → Flujo de datos y estado
15 → Patrones de diseño usados
02 → Cada pantalla explicada
```

### 🏗️ Revisión de Arquitectura
```
16 → ADR — decisiones y sus alternativas descartadas
15 → Patrones de diseño implementados
10 → Gestión de estado y flujo de datos
11 → Sistema de navegación
12 → Autenticación y guard de rutas
07 → Implementación i18n
```

---

## Respuestas Rápidas a Preguntas Frecuentes

| Pregunta | Documento |
|---|---|
| ¿Por qué no hay archivos `.html`? | **08** |
| ¿Por qué no hay archivos `.css`? | **08** |
| ¿Cómo funciona el cambio de idioma? | **07** |
| ¿Dónde se guardan los datos del usuario? | **10**, **12** |
| ¿Por qué React Native Paper y no Bootstrap/Tailwind? | **08**, **09** |
| ¿Cómo funciona el mapa en la versión web? | **14** (SafeMap.js) |
| ¿Qué hace cada pantalla? | **02** |
| ¿Cuáles son los colores de la marca? | **05** |
| ¿Cómo se elimina un estudiante con todos sus datos? | **10** |
| ¿Qué es Expo Router y cómo funciona? | **11**, **09** |
| ¿Por qué no Redux para el estado? | **16** (ADR-007) |
| ¿Por qué no i18next para el idioma? | **16** (ADR-003) |
| ¿Por qué no SQLite/Realm en vez de AsyncStorage? | **16** (ADR-002) |
| ¿Cómo funciona el GPS en tiempo real? | **14** |
| ¿Cómo agregar un nuevo idioma? | **07** (sección "Cómo agregar") |
| ¿Cómo ejecutar el proyecto? | **13** |
| ¿Cómo conectar al backend con Cloudflare Tunnel? | **13** |
| ¿Qué es un WebSocket y para qué se usa? | **14**, **17** |
| ¿Qué es el Provider Pattern? | **15** |
| ¿Qué significa AsyncStorage? | **17** |

---

## Dato Técnico Clave para Exposiciones

> **Este proyecto no tiene HTML ni CSS porque no es una aplicación web.**
>
> Es una aplicación **React Native** que compila a código nativo de Android e iOS, y gracias a `react-native-web`, también corre en navegadores. Los estilos se definen en JavaScript con `StyleSheet.create()`, no en archivos `.css`. Los contenedores son `<View>` no `<div>`. Los textos van en `<Text>` no en `<p>`. No hay motor CSS, no hay DOM del navegador, no hay archivos `.html`.
>
> → Ver **documento 08** para la explicación técnica completa con tablas comparativas.

---

*GPS Guardian Escolar — Frontend v1.0.0 | React Native 0.83.4 + Expo 55 | 17 documentos*
