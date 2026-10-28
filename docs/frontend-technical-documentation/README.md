# Documentacion tecnica del frontend

GPS Guardian Escolar es una aplicacion Expo para Android, iOS y web. Esta documentacion corresponde al codigo actual del repositorio. Para versiones exactas, el manifiesto `package.json` es la fuente de verdad.

**Version del producto:** 1.0.0
**Stack:** Expo SDK 57, Expo Router 57.0.25, React Native 0.86.3 y React 19.2.3.

## Documentos

| # | Documento | Tema |
|---|---|---|
| 01 | [Estructura general](./01_ESTRUCTURA_GENERAL.md) | Carpetas y convenciones |
| 02 | [Carpeta app](./02_CARPETA_APP.md) | Pantallas y rutas |
| 03 | [Componentes](./03_CARPETA_COMPONENTS.md) | Componentes visuales |
| 04 | [Carpetas del sistema](./04_CARPETAS_DEL_SISTEMA.md) | Hooks, contextos, servicios y utilidades |
| 05 | [Colores y funcionalidades](./05_COLORES_Y_FUNCIONALIDADES.md) | Interfaz y funciones |
| 06 | [Vision general](./06_EXPLICACION_GENERAL_DEL_PROYECTO.md) | Arquitectura y estado actual |
| 07 | [Internacionalizacion](./07_INTERNACIONALIZACION_I18N.md) | Idiomas ES y EN |
| 08 | [Estilos](./08_ESTILOS_POR_QUE_NO_CSS_NI_HTML.md) | React Native y estilos |
| 09 | [Dependencias](./09_DEPENDENCIAS.md) | Versiones actuales |
| 10 | [Datos y estado](./10_FLUJO_DE_DATOS_Y_ESTADO.md) | Flujos de API y estado local |
| 11 | [Navegacion](./11_NAVEGACION_EXPO_ROUTER.md) | Expo Router |
| 12 | [Autenticacion y seguridad](./12_AUTENTICACION_Y_SEGURIDAD.md) | Login, 2FA, sesiones y almacenamiento |
| 13 | [Configuracion y despliegue](./13_CONFIGURACION_Y_DESPLIEGUE.md) | Entorno local y Docker |
| 14 | [GPS y tiempo real](./14_GPS_Y_TIEMPO_REAL.md) | Ubicacion y STOMP |
| 15 | [Patrones de diseno](./15_PATRONES_DE_DISENO.md) | Estructura de codigo |
| 16 | [Decisiones de arquitectura](./16_DECISIONES_DE_ARQUITECTURA_ADR.md) | Decisiones y estado vigente |
| 17 | [Glosario](./17_GLOSARIO_TECNICO.md) | Terminos tecnicos |
| 18 | [Flujo Git](./18_FLUJO_DE_TRABAJO_GIT.md) | Ramas y pull requests |

## Estado de la integracion

El frontend consume el backend Spring Boot mediante REST y WebSocket. `services/api.js` configura Axios y agrega el JWT a las peticiones privadas; `services/socket.js` conecta el seguimiento STOMP. La aplicacion no usa un servicio de autenticacion simulado.

En Android e iOS, el JWT se guarda en `expo-secure-store`. En web se conserva solo en memoria: recargar o cerrar la pestana termina la sesion local. Los datos del perfil y algunas preferencias se almacenan aparte con AsyncStorage.

## Validacion local

```bash
npm ci
npm test
npm run lint
npx expo export --platform web
```
