# 🎨 Colores y Funcionalidades
## GPS Guardian Escolar

> Guía completa de la identidad visual y todas las funcionalidades disponibles en la aplicación.

---

## 🎨 PALETA DE COLORES OFICIAL

La identidad visual de Guardian Escolar sigue la regla **60-30-10**:
- **60%** → Color de fondo (Gris neutro claro).
- **30%** → Color principal de marca (Azul Medianoche).
- **10%** → Color de acento (Verde Lima).

---

### Colores Principales

| Nombre en Código | Hex | Vista | Uso |
|---|---|---|---|
| `FONDO_PRINCIPAL` | `#F4F5F7` | ⬜ Gris muy claro | Fondo de todas las pantallas |
| `PRIMARIO` | `#1A4F8A` | 🟦 Azul Medianoche | Barra superior, botones principales, marca |
| `ACENTO` | `#7BC74D` | 🟩 Verde Lima | Detalles, estado seguro, acentos de diseño |

---

### Colores de Superficies

| Nombre en Código | Hex | Uso |
|---|---|---|
| `FONDO_TARJETA` | `#FFFFFF` | Fondo de tarjetas (blanco) |
| `FONDO_INPUT` | `#F8F9FA` | Fondo de campos de texto |
| `FONDO_HEADER` | `#1A4F8A` | Barra superior de navegación |

---

### Colores de Texto

| Nombre en Código | Hex | Uso |
|---|---|---|
| `TEXTO_GENERAL` | `#1A1A1A` | Texto principal (negro suave) |
| `TEXTO_CONTRASTE` | `#FFFFFF` | Texto sobre fondos oscuros (blanco) |
| `TEXTO_SECUNDARIO` | `#6B7280` | Subtítulos, etiquetas, fechas (gris) |
| `TEXTO_AZUL` | `#1A4F8A` | Texto con color de marca |

---

### Variantes del Azul Principal

| Nombre en Código | Hex | Uso |
|---|---|---|
| `PRIMARIO_OSCURO` | `#133A66` | Hover y estados presionados |
| `PRIMARIO_SUAVE` | `#2A6CB5` | Gradientes y versiones más claras |
| `PRIMARIO_CLARO` | `#E8EFF7` | Fondos con tono azul muy suave |

---

### Variantes del Verde Acento

| Nombre en Código | Hex | Uso |
|---|---|---|
| `ACENTO_OSCURO` | `#5C9E37` | Hover del botón verde |
| `ACENTO_CLARO` | `#F1F9EE` | Fondo de badges de estado OK |

---

### Colores de Estado y Alerta

| Nombre en Código | Hex | Vista | Uso |
|---|---|---|---|
| `ALERTA` | `#E53935` | 🔴 Rojo | Errores, alertas críticas, estudiante fuera de ruta |
| `ALERTA_CLARO` | `#FFEBEE` | Rojo muy claro | Fondo de tarjetas de alerta |
| `ADVERTENCIA` | `#F59E0B` | 🟡 Amarillo | Advertencias y situaciones de precaución |
| `ESTADO_OK` | `#7BC74D` | 🟢 Verde | Estado correcto, llegó a destino |
| `ESTADO_ALERTA` | `#E53935` | 🔴 Rojo | Estado de alerta activa |

---

### Colores de Bordes y Neutros

| Nombre en Código | Hex | Uso |
|---|---|---|
| `BLANCO` | `#FFFFFF` | Blanco puro |
| `NEGRO` | `#000000` | Negro puro |
| `GRIS_BORDE` | `#E0E4E8` | Bordes de tarjetas e inputs |

---

### Colores Legacy (Compatibilidad)

> Estos colores existen para no romper pantallas antiguas. Son equivalentes a los colores principales.

| Nombre Legacy | Equivalente Actual |
|---|---|
| `AZUL_FONDO` | = `FONDO_PRINCIPAL` |
| `AZUL_BOTON` | = `PRIMARIO` |
| `AZUL_LOGO` | = `PRIMARIO` |
| `GRIS_TARJETA` | = `FONDO_TARJETA` |
| `GRIS_INPUT` | = `FONDO_INPUT` |

---

## ✅ FUNCIONALIDADES DE LA APLICACIÓN

### 🔐 Módulo de Autenticación

| Funcionalidad | Descripción |
|---|---|
| **Inicio de Sesión** | Login con correo y contraseña, opción "Recordarme" |
| **Registro** | Creación de cuenta de acudiente con validación de campos |
| **Recuperar Contraseña** | Flujo de 3 pasos: correo → código → nueva contraseña |
| **Verificación por Código** | Código de 6 dígitos enviado al correo del usuario |

---

### 👨‍👧 Módulo de Estudiantes

| Funcionalidad | Descripción |
|---|---|
| **Ver Hijos** | Lista de todos los hijos vinculados con tarjeta visual |
| **Agregar Hijo** | Formulario con nombre, grado, colegio, edad, contacto de emergencia |
| **Editar Hijo** | Modificar todos los datos de un hijo existente |
| **Eliminar Hijo** | Eliminación permanente + limpieza de historial y notificaciones asociadas |
| **Foto del Hijo** | Tomar foto con la cámara o seleccionar de galería |
| **Estado Manual** | Cambiar el estado del hijo: Zona Segura / En Trayecto / Alerta |
| **Ver en Mapa** | Acceso rápido al mapa de seguimiento desde la tarjeta del hijo |

---

### 🗺️ Módulo de Seguimiento GPS

| Funcionalidad | Descripción |
|---|---|
| **Mapa en Tiempo Real** | Visualización del mapa con la posición del estudiante |
| **Marcador Personalizado** | Pin con inicial del nombre y color según estado |
| **Zona Segura Visual** | Círculo semitransparente en el mapa que indica el área segura |
| **Panel de Estado** | Estado actual, velocidad, hora de última actualización |
| **Selector de Hijo** | Cambiar entre hijos cuando hay varios registrados |
| **Indicador Online/Offline** | Barra superior muestra si el servicio está activo (LIVE/Sin Señal) |

---

### 🔔 Módulo de Notificaciones

| Funcionalidad | Descripción |
|---|---|
| **Centro de Alertas** | Lista de todos los eventos con icono y color según tipo |
| **Tipos de Notificación** | ✅ Exitosas, ⚠️ Advertencias, ℹ️ Informativas |
| **Filtro por Tipo** | Ver solo un tipo de notificación a la vez |
| **Eliminar Notificación** | Borrar un aviso individual de la lista |
| **Contador de Notificaciones** | Muestra el total de notificaciones activas |

---

### 📋 Módulo de Historial

| Funcionalidad | Descripción |
|---|---|
| **Registro de Trayectos** | Lista completa de todos los eventos pasados |
| **Filtro por Nombre** | Buscar eventos de un hijo específico |
| **Filtro por Fecha** | Buscar eventos en una fecha específica |
| **Filtro por Estado** | Completados / En Proceso / Con Incidente |
| **Estadísticas Rápidas** | Contadores de cada tipo de estado al inicio de la pantalla |
| **Detalle del Trayecto** | Hora inicio/fin, duración, estado, observación, ruta |
| **Eliminar Registro** | Borrar un evento individual del historial |

---

### 🗺️ Módulo de Zonas y Rutas

| Funcionalidad | Descripción |
|---|---|
| **Crear Zona Segura** | Definir área con nombre, dirección y radio de cobertura |
| **Editar Zona** | Modificar datos de una zona existente |
| **Eliminar Zona** | Borrar una zona segura |
| **Crear Ruta** | Definir ruta con nombre, punto de inicio y llegada |
| **Editar Ruta** | Modificar datos de una ruta guardada |
| **Eliminar Ruta** | Borrar una ruta del sistema |
| **Asignar por Hijo** | Cada zona/ruta está vinculada a un hijo específico |

---

### 👤 Módulo de Perfil

| Funcionalidad | Descripción |
|---|---|
| **Ver Perfil** | Nombre, email, teléfono y foto del acudiente |
| **Editar Perfil** | Modificar datos personales |
| **Preferencias de Notificaciones** | Activar/desactivar por tipo de evento |
| **Notificaciones por Email/SMS** | Configurar canales de notificación externos |
| **Cambiar Contraseña** | Actualizar contraseña desde dentro de la app |
| **Autenticación de Dos Factores** | Activar/desactivar 2FA para mayor seguridad |
| **Selector de Idioma** | Cambiar entre Español e Inglés |
| **Cerrar Sesión** | Limpiar sesión y volver a la pantalla de bienvenida |

---

### 🌐 Funcionalidades Globales

| Funcionalidad | Descripción |
|---|---|
| **Soporte Bilingüe** | Toda la app disponible en Español e Inglés |
| **Modo Web** | Funciona en navegadores web con diseño adaptado |
| **Modo Móvil** | Android e iOS con mapa real y GPS del dispositivo |
| **Indicador LIVE** | Punto parpadeante en la barra superior (verde=conectado, rojo=sin señal) |
| **Datos Locales** | Historial y notificaciones guardados en el dispositivo |
| **Sincronización al entrar** | Cada pantalla recarga sus datos al ser visitada |

---

## 🎨 Tipografía y Diseño

- **Fuente:** Sistema (San Francisco en iOS, Roboto en Android, Inter en Web).
- **Estilo:** Material Design 3 a través de `react-native-paper`.
- **Tema:** Diseño claro (Light Mode) con superficies blancas y fondo gris.
- **Bordes:** Redondeados (border-radius 8-16px) para un aspecto moderno.
- **Sombras:** Elevación sutil en tarjetas para profundidad visual.
- **Animaciones:** Punto LIVE parpadeante, transiciones de pantallas, estados de carga.
