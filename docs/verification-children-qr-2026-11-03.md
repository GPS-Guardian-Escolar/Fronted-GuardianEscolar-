# Verificación de tarjetas de hijos y QR

Fecha: 3 de noviembre de 2026.

## Bases y alcance

- Frontend: rama `fix/children-actions-and-qr`, creada desde `origin/develop` (`d749f1c`).
- Backend: rama del mismo nombre, creada desde `origin/dev` (`5b00ede`). Sus cambios son pruebas automatizadas.
- No se modificó la base de datos ni se ejecutaron migraciones.
- No se hicieron commits, push ni despliegues.

## Cambios

1. Todas las tarjetas muestran editar, compartir, eliminar y la opción de generar QR cuando no hay un código vigente. El propietario y el administrador conservan la administración; los acudientes con acceso compartido reciben una explicación de solo lectura al pulsar estas acciones.
2. El botón de generar código dentro del formulario de edición pasa explícitamente el estudiante. Antes recibía el evento del clic y salía sin generar código.
3. La generación muestra confirmación y errores traducidos: sesión vencida, permiso insuficiente, estudiante inexistente, demasiadas solicitudes y problemas de conexión. Evita solicitudes simultáneas desde esta pantalla.
4. El código recién generado se conserva en memoria al refrescar la lista mientras sea vigente, se mantenga el permiso y no cambie el número de dispositivos vinculados. No se guarda en almacenamiento persistente.
5. Los códigos vencidos dejan de mostrarse. Una respuesta tardía no cambia el estudiante que se está editando por otro.
6. El lector de enlaces QR admite entornos sin `window.location`, usando una base de respaldo para interpretar el enlace.

## Evidencia local

- Frontend: 20 pruebas unitarias aprobadas en 4 suites.
- Verificador funcional existente: aprobado; comprueba validaciones, preferencias, QR, autenticación del estudiante, cola GPS, traducciones, historial y geometría de rutas. Es una comprobación automatizada local, no un recorrido completo en dispositivos reales.
- ESLint: sin errores en los archivos JavaScript modificados.
- Exportación web de Expo: correcta, 41 rutas, incluidas `/student`, `/scan-qr` y `/login`. Se usaron direcciones locales de prueba; el artefacto no es un despliegue de producción.
- Backend: 14 pruebas dirigidas aprobadas, incluyendo acceso compartido, emisión, sustitución, consumo único del código y transacciones de estudiantes.
- Después se ejecutó la suite completa del backend: 72 pruebas, cero errores, cero fallos y ninguna omitida (`BUILD SUCCESS`).

## Verificación pendiente en Render y teléfonos

Estos resultados no certifican que todo el aplicativo funcione al 100% en producción. Falta probar la versión desplegada con una cuenta autorizada: generar QR en tarjeta y formulario, escanear con un teléfono real, conceder ubicación, iniciar trayecto, observar actualizaciones en el acudiente y verificar desconexión/reconexión y alertas. El fallo específico del botón de la tarjeta en Render no se reprodujo contra su servidor real; los nuevos mensajes permiten identificar la causa si persiste.

Los permisos compartidos no se ampliaron. Un acceso de solo lectura no puede emitir códigos ni modificar o eliminar al estudiante.

## Avisos de correo y ruta asignada

- Tras registrarse, el acudiente llega al inicio de sesión con un aviso persistente que confirma el envío del correo de verificación e indica la dirección usada. La confirmación de dispositivo y el restablecimiento de contraseña también muestran avisos visibles; los textos están traducidos a español, inglés, francés y portugués.
- En seguimiento, las rutas entregadas por la API se trazan sobre calles. Se marcan sus puntos de inicio y destino y se informa si no hay ruta asignada o si no se pudo calcular la geometría. Las coordenadas vacías ya no se interpretan como `0,0`.
- Suite frontend actualizada: 20 pruebas unitarias aprobadas. El export web incluye `/tracking`, `/zones`, registro, inicio de sesión y verificación.
