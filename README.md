# Actividad 22 - Mantenimiento Universitario

Aplicación móvil para registrar, consultar y dar seguimiento a reportes de mantenimiento universitario. El proyecto incluye una aplicación React Native con Expo SDK 58, una API REST, autenticación remota y una versión web de demostración.

## Aplicación móvil

El código móvil se encuentra en `mobile-app/`.

### Funcionalidades

- Autenticación remota con correo y contraseña.
- Registro y consulta de reportes.
- Categoría, prioridad, edificio, ubicación y descripción.
- Evidencia fotográfica desde cámara o galería.
- Seguimiento del estado e historial.
- Búsqueda y panel de indicadores.
- Cola sin conexión y sincronización posterior.
- Token protegido mediante Expo SecureStore.
- Manejo de errores y validación de datos.

### Tecnologías

- React Native
- Expo SDK 58
- Expo Image Picker
- Expo SecureStore
- AsyncStorage
- NetInfo

### Ejecutar en un celular

```bash
cd mobile-app
npm install
npx expo install --fix
npx expo start --tunnel
```

Después, escanea el código QR con Expo Go.

### Validación

```bash
npx expo-doctor
npx expo export --platform android
```

## API y demostración web

La raíz del repositorio contiene el servicio Node.js, las pruebas y la versión web utilizada para demostrar la integración móvil-nube.

```bash
npm install
npm start
```

## Actividad académica

Caso de estudio individual sobre integración segura de una aplicación móvil con servicios en la nube para la gestión de reportes de mantenimiento universitario.
