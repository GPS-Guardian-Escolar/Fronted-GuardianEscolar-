# 🧩 Carpeta `components/` — Componentes Reutilizables
## GPS Guardian Escolar

> Esta carpeta contiene piezas de interfaz de usuario (UI) que se usan en **múltiples pantallas**. La idea es no repetir código: si algo se usa en más de un lugar, se convierte en un componente.

---

## ¿Qué es un Componente?

Un componente es un "bloque" visual independiente. Por ejemplo, un botón con un estilo específico, o un mapa. En lugar de copiar el mismo código en cada pantalla, se crea una vez aquí y se importa donde se necesite.

---

## 📂 Estructura de la Carpeta

```
components/
├── SafeMap.js          ← Componente principal del mapa (importante)
├── common/             ← Componentes de uso general
│   ├── AlertCard.js
│   ├── CustomButton.js
│   ├── CustomInput.js
│   ├── EmptyState.js
│   └── LoadingSpinner.js
├── layout/             ← Componentes de estructura de pantalla
│   └── ScreenContainer.js
├── map/                ← Componentes específicos del mapa GPS
│   ├── MapComponent.js
│   ├── RoutePolyline.js
│   ├── SafeZoneCircle.js
│   └── StudentMarker.js
├── shared/             ← Componentes compartidos (reservado para el futuro)
├── students/           ← Componentes de tarjetas de estudiantes (reservado)
└── tracking/           ← Componentes del módulo de rastreo (reservado)
```

---

## 📄 `SafeMap.js` — Mapa Seguro (Archivo Raíz)

**¿Qué hace?**
Es el componente más importante de esta carpeta. Actúa como un **envoltorio inteligente** para los mapas de la aplicación.

**El problema que resuelve:** `react-native-maps` (la librería de mapas) NO funciona en navegadores web, solo en Android/iOS. Este componente detecta automáticamente en qué plataforma está corriendo y:
- **En Móvil (Android/iOS):** Muestra el mapa real de Google Maps con todas sus funciones.
- **En Web (Navegador):** Muestra una versión simulada del mapa con un diseño similar para que la interfaz no se rompa.

**Usado en:** `tracking.js`, `history.js`, `zones.js`

---

## 📁 `common/` — Componentes Generales

Componentes básicos que se pueden usar en cualquier pantalla de la app.

---

### `CustomButton.js`
**¿Qué es?**
Un botón estilizado con el diseño de la marca Guardian Escolar. Reemplaza al botón genérico de React Native con:
- Color de fondo personalizable.
- Texto centrado con fuente del proyecto.
- Estado de "cargando" (muestra un spinner cuando espera una respuesta).
- Soporte para deshabilitar el botón.

**Se usa en:** Formularios de autenticación, modales.

---

### `CustomInput.js`
**¿Qué es?**
Campo de texto estilizado con el diseño del proyecto. Incluye:
- Borde con el color oficial cuando está activo.
- Icono opcional a la izquierda.
- Soporte para campos de contraseña (ocultar/mostrar texto).
- Mensaje de error debajo del campo.

**Se usa en:** Formularios de login, registro, edición de perfil.

---

### `AlertCard.js`
**¿Qué es?**
Tarjeta visual para mostrar mensajes de alerta, éxito o información al usuario. Similar a las notificaciones que aparecen en la pantalla de alertas.

**Tipos:** Error (rojo), Éxito (verde), Informativo (azul), Advertencia (amarillo).

---

### `EmptyState.js`
**¿Qué es?**
Componente que se muestra cuando una lista está vacía. Por ejemplo, cuando no hay hijos registrados o no hay notificaciones. Muestra un ícono grande y un mensaje descriptivo para que el usuario entienda qué hacer.

**Se usa en:** Listados de estudiantes, notificaciones, historial vacío.

---

### `LoadingSpinner.js`
**¿Qué es?**
Indicador de carga animado que aparece mientras la aplicación está esperando datos del servidor. Muestra un círculo giratorio con el color primario de la app.

**Se usa en:** Al hacer login, al cargar el mapa, al sincronizar datos.

---

## 📁 `layout/` — Componentes de Estructura

Componentes que definen cómo se organiza el contenido dentro de una pantalla.

---

### `ScreenContainer.js`
**¿Qué es?**
Un contenedor base para pantallas. Aplica automáticamente:
- El color de fondo oficial (`COLORS.FONDO_PRINCIPAL`).
- Márgenes seguros para no solaparse con la barra de estado del sistema operativo (notch, barra de navegación de Android).
- Scroll si el contenido es más largo que la pantalla.

**Se usa en:** Pantallas de autenticación y algunas pantallas internas.

---

## 📁 `map/` — Componentes del Mapa GPS

Componentes visuales específicos para la pantalla de mapa y seguimiento.

---

### `MapComponent.js`
**¿Qué es?**
El componente principal del mapa de seguimiento. Configura `react-native-maps` con las opciones necesarias: región inicial, tipo de mapa, estilo y control de gestos (zoom, desplazamiento).

---

### `StudentMarker.js`
**¿Qué es?**
El marcador (pin) personalizado que aparece en el mapa sobre la ubicación del estudiante. En lugar del pin genérico rojo de Google Maps, muestra un ícono con la inicial del nombre del estudiante y el color de su estado (verde = seguro, rojo = alerta, azul = en camino).

---

### `SafeZoneCircle.js`
**¿Qué es?**
El círculo semitransparente que aparece en el mapa para indicar la **zona segura** del estudiante (ej: el área alrededor del colegio). Se dibuja con el color verde de la paleta y un borde más oscuro para que sea visible.

---

### `RoutePolyline.js`
**¿Qué es?**
La línea que se dibuja en el mapa para mostrar la **ruta recorrida** por el estudiante. Conecta los puntos de ubicación registrados y la muestra como una línea de color sobre el mapa, indicando el trayecto.

---

## 📁 Carpetas Vacías (Reservadas para el Futuro)

| Carpeta | Propósito Futuro |
|---|---|
| `shared/` | Componentes que serán compartidos entre múltiples módulos de `features/` |
| `students/` | Tarjetas y vistas específicas para la gestión avanzada de estudiantes |
| `tracking/` | Paneles de información del seguimiento GPS en tiempo real |

> Estas carpetas están preparadas para cuando el proyecto escale y se necesite más organización de componentes específicos por módulo.
