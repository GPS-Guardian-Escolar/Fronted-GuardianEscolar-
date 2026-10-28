# 🎨 Estilos y Diseño — Por qué JavaScript en vez de CSS o HTML
## GPS Guardian Escolar

> **Pregunta frecuente en exposiciones:** *"¿Por qué no usan CSS? ¿Por qué no hay archivos `.html`?"*
> Esta sección responde esa pregunta con profundidad técnica y documenta completamente el sistema de estilos adoptado.

---

## La Respuesta Corta

**React Native no es un sitio web.** No corre en un navegador, sino directamente en el sistema operativo de Android e iOS. Eso significa:

| Web tradicional | React Native (Este proyecto) |
|---|---|
| HTML para estructura | Componentes de React (`<View>`, `<Text>`) |
| CSS para estilos | `StyleSheet.create({})` de JavaScript |
| DOM del navegador | Bridge nativo → UI Components del SO |
| Archivos `.html` | Archivos `.js` / `.jsx` |
| `div`, `span`, `p` | `View`, `Text`, `ScrollView` |
| `className="btn"` | `style={styles.btn}` |

---

## ¿Qué Reemplaza al HTML?

En React Native, los "elementos" equivalentes a las etiquetas HTML son **componentes**:

```
HTML             →    React Native
────────────────────────────────────
<div>            →    <View>
<p>, <span>      →    <Text>
<img>            →    <Image>
<input>          →    <TextInput>
<button>         →    <TouchableOpacity> o <Pressable>
<ul><li>         →    <FlatList> con renderItem
<a>              →    <TouchableOpacity> + router.push()
<form>           →    <View> con TextInput + botón
```

**Importante:** En React Native, **todo texto DEBE estar dentro de `<Text>`**. Poner texto directamente dentro de `<View>` causa un error en tiempo de ejecución:
```jsx
// ❌ Error: Unexpected text node
<View>Hola mundo</View>

// ✅ Correcto
<View><Text>Hola mundo</Text></View>
```

---

## ¿Qué Reemplaza al CSS?

En lugar de archivos `.css`, los estilos se definen dentro del mismo archivo `.js` usando la API `StyleSheet` de React Native:

```javascript
import { StyleSheet } from 'react-native';

// Se define al final del archivo, fuera del componente
const styles = StyleSheet.create({
  container: {
    flex: 1,                      // equivale a display: flex; flex: 1
    backgroundColor: '#F4F5F7',  // background-color
    paddingHorizontal: 16,        // padding-left + padding-right
    borderRadius: 12,             // border-radius
  },
  title: {
    fontSize: 22,                 // font-size
    fontWeight: 'bold',           // font-weight
    color: '#1A1A1A',             // color
  },
});
```

### Diferencias clave entre CSS y StyleSheet

| CSS | StyleSheet de RN | Nota |
|---|---|---|
| `background-color` | `backgroundColor` | camelCase |
| `font-size: 16px` | `fontSize: 16` | Sin unidades (los puntos son la unidad) |
| `margin: 10px 20px` | `marginVertical: 10, marginHorizontal: 20` | No shorthand |
| `display: flex` | Todo es flex por defecto | No hace falta declararlo |
| `flex-direction: row` | `flexDirection: 'row'` | Los valores son strings |
| `border: 1px solid red` | `borderWidth: 1, borderColor: 'red'` | Se separan |
| `box-shadow` | `elevation` (Android) / `shadow*` (iOS) | Diferente por plataforma |
| `%` (porcentajes) | `Dimensions.get('window').width * 0.5` | Se calculan en código |
| `:hover` | `onPressIn` / `onHoverIn` | Eventos en vez de pseudo-clases |
| `@media query` | `useWindowDimensions()` hook | Condicionales en JS |

### ¿Por qué `StyleSheet.create()` en vez de objeto literal?

```javascript
// Opción A: objeto literal (funciona pero no es óptimo)
<View style={{ backgroundColor: '#fff', padding: 16 }} />

// Opción B: StyleSheet.create() (recomendado en este proyecto)
const styles = StyleSheet.create({ card: { backgroundColor: '#fff', padding: 16 } });
<View style={styles.card} />
```

`StyleSheet.create()` valida los estilos en tiempo de desarrollo (avisa si una propiedad no existe), los **convierte a IDs numéricos** en producción (más rápido que reenviar objetos en cada render), y los **centraliza al final del archivo** para separar lógica de presentación.

---

## El Sistema de Colores — `constants/colors.js`

En CSS se usarían variables CSS (`--color-primario: #1A4F8A`). En React Native, se usan **constantes de JavaScript**:

```javascript
// constants/colors.js
export const COLORS = {
  PRIMARIO: '#1A4F8A',
  ACENTO:   '#7BC74D',
  ALERTA:   '#E53935',
  // ...
};
```

Y se importan en cada pantalla:
```javascript
import { COLORS } from '../../constants/colors';

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.PRIMARIO,   // En lugar de '#1A4F8A' repetido en 20 archivos
  },
});
```

**Beneficio crítico:** Si la identidad visual cambia (ej: el azul pasa de `#1A4F8A` a `#1E3A6E`), se cambia **una sola línea** en `colors.js` y se actualiza en toda la app automáticamente. Esto es equivalente a la variable CSS `var(--color-primario)` pero en JavaScript.

---

## React Native Paper — El Sistema de Diseño

Este proyecto usa **React Native Paper** (`react-native-paper`), una librería de componentes que implementa **Material Design 3** adaptado a React Native.

### ¿Qué aporta?

```javascript
import { Text, Surface, Avatar, FAB, Button } from 'react-native-paper';
```

| Componente Paper | Equivalente manual |
|---|---|
| `<Surface elevation={2}>` | `<View>` con `elevation` y `shadowColor` en Android/iOS |
| `<Avatar.Text label="MP">` | Círculo con iniciales, fondo de color, texto centrado |
| `<FAB icon="plus">` | Botón flotante circular en la esquina inferior |
| `<Button mode="contained">` | Botón con fondo, estilos de hover y disabled integrados |
| `<TextInput mode="outlined">` | Campo de texto con label flotante, borde animado y estados |
| `<Searchbar>` | Barra de búsqueda con ícono y clear integrados |
| `<IconButton>` | Botón de ícono circular con ripple effect |

### ¿Por qué Paper y no hacerlo manual?

Implementar un `Avatar.Text` manualmente requiere:
```javascript
// Sin Paper (30 líneas de código)
<View style={{ width: 44, height: 44, borderRadius: 22,
               backgroundColor: '#1A4F8A', justifyContent: 'center',
               alignItems: 'center', elevation: 2, shadowColor: '#000',
               shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.2 }}>
  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>MP</Text>
</View>

// Con Paper (1 línea)
<Avatar.Text size={44} label="MP" style={{ backgroundColor: COLORS.PRIMARIO }} />
```

---

## Estilos por Plataforma — Web vs. Móvil

Dado que la app funciona en web Y móvil, algunos estilos deben diferir:

```javascript
import { Platform, useWindowDimensions } from 'react-native';

// Detección del entorno
const { width } = useWindowDimensions();
const isWeb = width > 768;    // ← Umbral de "pantalla grande"

// Estilos condicionales
<View style={[
  styles.container,
  isWeb && styles.containerWeb    // Solo se aplica en web
]} />

// En StyleSheet
const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  containerWeb: {
    maxWidth: 1000,       // En web, limitar el ancho para no estirar el layout
    alignSelf: 'center',  // Centrar en pantallas grandes
    width: '100%',
  },
});
```

---

## Flexbox en React Native

A diferencia de CSS donde `display: flex` es opcional, en React Native **todo es Flexbox por defecto**. La diferencia más importante:

| CSS Flexbox | React Native Flexbox |
|---|---|
| `flex-direction: row` (por defecto) | `flexDirection: 'column'` (⚠️ por defecto) |
| `align-items: stretch` | `alignItems: 'stretch'` (igual) |
| `justify-content: flex-start` | `justifyContent: 'flex-start'` (igual) |
| `flex: 1` | `flex: 1` (igual — ocupa el espacio disponible) |

---

## Íconos — MaterialCommunityIcons

En vez de imágenes SVG o fuentes de íconos en CSS, se usa la librería `@expo/vector-icons`:

```javascript
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Uso (no requiere CSS ni archivos de fuente manual)
<MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.PRIMARIO} />
```

Expo gestiona automáticamente la carga de la fuente de íconos. No hay que importar ningún `.ttf`, definir `@font-face` ni nada similar.

---

## Resumen Ejecutivo

| Pregunta | Respuesta |
|---|---|
| ¿Por qué no HTML? | React Native usa componentes nativos, no el DOM del navegador |
| ¿Por qué no CSS? | Los estilos se definen en JavaScript con `StyleSheet.create()` |
| ¿Por qué no archivos `.css`? | No hay ningún motor CSS. Los estilos se procesan en JS → UI nativa |
| ¿Cómo se manejan los colores? | Constantes en `constants/colors.js` importadas en cada pantalla |
| ¿Qué reemplaza a Bootstrap/Tailwind? | `react-native-paper` con Material Design 3 |
| ¿Cómo se hacen los íconos? | `MaterialCommunityIcons` de `@expo/vector-icons` |
| ¿Cómo se hace responsive? | `useWindowDimensions()` + condicionales en JS |
| ¿Funciona igual en web y móvil? | Sí, con `react-native-web` que "traduce" los componentes al DOM |
