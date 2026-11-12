# Mantenimiento U — aplicación móvil

Aplicación nativa multiplataforma creada con React Native y Expo SDK 58. Consume la API desplegada en `https://mantenimiento-u-actividad22.onrender.com/api`.

## Funciones implementadas

- Inicio de sesión remoto y token guardado en `expo-secure-store`.
- Panel con indicadores de reportes.
- Registro de reportes con ubicación, categoría, prioridad y descripción.
- Fotografía desde la cámara o galería mediante `expo-image-picker`.
- Consulta y detalle de reportes con historial de seguimiento.
- Restricción de información aplicada por la API según propietario y rol.
- Detección de conexión y cola local de reportes con sincronización posterior.
- Cierre de sesión y eliminación del token local.
- Perfiles de EAS para generar APK y AAB.

## Ejecutar en un celular Android

Requisitos: Node.js 22.13 o posterior y Expo Go compatible con SDK 58.

```bash
cd mobile-app
npm install
npx expo install --fix
npx expo-doctor
npx expo start --tunnel
```

1. Instala **Expo Go** en el celular.
2. Escanea el código QR mostrado por Expo.
3. Inicia sesión con las credenciales de demostración entregadas por separado.

## Capturas requeridas

Guarda las capturas reales del celular en `evidencias-celular/` con estos nombres:

1. `01-login.png`
2. `02-autenticacion-exitosa.png`
3. `03-registro-reporte.png`
4. `04-envio-exitoso.png`
5. `05-consulta-reportes.png`
6. `06-manejo-error.png`

## Generar APK

```bash
npx eas login
npx eas build:configure
npm run build:apk
```

El perfil `preview` de `eas.json` genera un APK instalable. El perfil `production` genera un AAB.

## Seguridad aplicada

- HTTPS para toda la comunicación.
- Token en SecureStore.
- La contraseña no se almacena en el dispositivo.
- Validación del formulario antes del envío.
- Autorización por propietario y rol en el servidor.
- Token con vencimiento.
- Mensajes de error controlados.
- Credenciales administrativas fuera del código de la aplicación.
