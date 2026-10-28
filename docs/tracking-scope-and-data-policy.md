# Alcance del seguimiento y políticas de datos

## Seguimiento GPS y señal

- La pantalla de seguimiento avisa cuando un trayecto activo pasa más de dos minutos sin recibir una ubicación. El aviso indica pérdida de actualización, no diagnostica si la causa fue señal, GPS, permisos, batería o una pausa.
- El mapa une las coordenadas recibidas. Un tramo recto entre dos puntos no representa necesariamente cada giro del trayecto.
- En la tarjeta del estudiante se informa cuántos celulares están vinculados. El vínculo QR por sí solo no prueba que el teléfono esté conectado ni transmitiendo; el estado de ubicación debe basarse en puntos recientes del trayecto activo.
- Los QR nuevos codifican un enlace a la pantalla `/scan-qr` con el identificador y el código temporal de vinculación. El escáner de la aplicación también acepta QR JSON antiguos con `v`, `s` y `c`. Una cámara genérica puede mostrar/buscar texto JSON de códigos antiguos; para esos casos se debe escanear desde la pantalla QR de Guardian Escolar.

## Validación y límites

- El nombre del estudiante y del contacto se limita a 3–60 caracteres, letras y separadores permitidos; la entrada inválida se rechaza mientras se escribe y se valida otra vez al guardar.
- El teléfono colombiano exige 10 dígitos, prefijo móvil `3` y no acepta cinco dígitos iguales consecutivos.
- La edad admitida es de 5 a 18 años, inclusive, tanto en cliente como en servidor. El grado también debe corresponder a la edad permitida por el catálogo.
- Cada cuenta puede tener hasta 20 estudiantes activos. El servidor serializa la creación por cuenta y valida el límite para que solicitudes concurrentes no lo excedan. El límite reduce el crecimiento no acotado de estudiantes, rutas y notificaciones por cuenta; no equivale a una prueba de rendimiento.

## Conservación

- Coordenadas: 7 días después de cerrar un trayecto.
- Historial del trayecto: 30 días después de cerrarlo.
- Notificaciones y recibos: 3 días.
- Rutas guardadas y zonas seguras: hasta su eliminación por el acudiente.
- Trayectos activos o sin fecha de cierre: no se eliminan por la purga.

El backend ejecuta la purga diariamente a las 03:15 UTC. La especificación de retención de base de datos está en `DB-Structure-Guardian-Escolar/docs/database/tracking-data-retention.md`. La purga es permanente; revisar respaldo y registros del primer despliegue.

## Términos y datos de menores

La aceptación de términos registra la decisión del usuario y debe explicar la finalidad del tratamiento, ubicación y otros datos recopilados, duración de conservación, derechos y canales de contacto. La autorización que corresponda al representante legal no elimina las obligaciones del responsable del tratamiento ni garantiza inmunidad frente a reclamaciones. Revisar términos y aviso de privacidad con asesoría jurídica antes de operar el seguimiento de menores.

Referencias oficiales para revisión en Colombia:

- [Ley 1581 de 2012, artículos 7 y 9](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981).
- [Decreto 1377 de 2013, artículo 12](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646).
- [Superintendencia de Industria y Comercio: el silencio y la inacción no constituyen consentimiento](https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/boletin/el-silencio-las-casillas-premarcadas-por-defecto-y-la-inaccion-no-constituyen-el-consentimiento-conforme-con).
