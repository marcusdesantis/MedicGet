# Generar APK de Android - MedicGet Mobile

Esta guia explica como compilar el APK localmente con Gradle, apuntando
al servidor de produccion en `http://89.117.58.101:8080`.

## Resumen del setup actual

- `.env` -> `EXPO_PUBLIC_API_BASE_URL=http://89.117.58.101:8080/api/v1`
- `app.json` -> `extra.apiBaseUrl` espeja la misma URL.
- Plugin `expo-build-properties` con `usesCleartextTraffic: true` para
  que Android acepte llamadas HTTP (el VPS expone el backend por HTTP,
  no HTTPS).
- `versionCode: 1`, `version: 1.0.0` -> cambia ambos en cada release.
- Package id: `com.medicget.app`.

## Prerequisitos en tu PC

1. **Node 20+** (chequea con `node -v`).
2. **JDK 17** instalado y `JAVA_HOME` apuntando a el.
   ```powershell
   java -version    # debe decir 17.x
   echo $env:JAVA_HOME
   ```
3. **Android SDK + cmdline-tools + build-tools 34** (lo que instala
   Android Studio por defecto). `ANDROID_HOME` debe apuntar a la carpeta
   del SDK, por ejemplo `C:\Users\TU_USUARIO\AppData\Local\Android\Sdk`.
   Acepta licencias:
   ```powershell
   & "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
   ```

## Paso 0 - Instalar dependencias nuevas

Cada vez que pulles el repo despues de cambios en `package.json`:

```powershell
cd C:\Projects\medicget\project\medicget-mobile
npm install
```

> El cambio importante para esta release fue agregar `expo-build-properties`
> (necesario para habilitar `usesCleartextTraffic` en Android).

## Paso 1 - Verificar typecheck

```powershell
npm run typecheck
```

Debe pasar sin errores antes de seguir.

## Paso 2 - Generar el proyecto nativo Android (`prebuild`)

Expo no incluye la carpeta `android/` en el repo. La generamos a partir
del `app.json`:

```powershell
npm run prebuild
```

(Equivale a `expo prebuild --platform android --clean`.) Esto crea
`medicget-mobile/android/` con los Gradle files y aplica las opciones
del plugin `expo-build-properties` (cleartext traffic, target SDK, etc.).

> Si ya tenias una carpeta `android/` con cambios manuales, hace backup
> antes; `--clean` la sobrescribe.

## Paso 3 - Generar el keystore de release (solo la primera vez)

Para distribuir el APK necesitas firmarlo. Genera un keystore propio:

```powershell
cd C:\Projects\medicget\project\medicget-mobile\android\app
keytool -genkeypair -v -keystore medicget-release.keystore `
        -alias medicget -keyalg RSA -keysize 2048 -validity 10000
```

Te va a pedir contrasenia y datos del titular. **Anotalos en un lugar
seguro** - si los perdes no podras publicar updates de la app.

Despues crea / edita `android/gradle.properties` y agrega:

```properties
MEDICGET_UPLOAD_STORE_FILE=medicget-release.keystore
MEDICGET_UPLOAD_KEY_ALIAS=medicget
MEDICGET_UPLOAD_STORE_PASSWORD=TU_PASSWORD
MEDICGET_UPLOAD_KEY_PASSWORD=TU_PASSWORD
```

Y en `android/app/build.gradle`, dentro de `android { ... }`, agrega:

```groovy
signingConfigs {
    release {
        if (project.hasProperty('MEDICGET_UPLOAD_STORE_FILE')) {
            storeFile file(MEDICGET_UPLOAD_STORE_FILE)
            storePassword MEDICGET_UPLOAD_STORE_PASSWORD
            keyAlias MEDICGET_UPLOAD_KEY_ALIAS
            keyPassword MEDICGET_UPLOAD_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

> Si solo queres probar el APK en tu telefono y no te importa firmarlo
> oficialmente, **saltea este paso** y usa el debug build (paso 4b).

## Paso 4a - Build de release (APK firmado, listo para distribuir)

```powershell
npm run apk:release
```

(equivale a `cd android && .\gradlew.bat assembleRelease`).

Cuando termine vas a tener el APK en:

```
android/app/build/outputs/apk/release/app-release.apk
```

## Paso 4b - Build de debug (mas rapido, no requiere firma manual)

```powershell
npm run apk:debug
```

Genera el APK en:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Sirve para probar en tu telefono via `adb install` o copiando el
archivo al dispositivo. **No** lo subas a la Play Store - usa el de
release para eso.

## Paso 5 - Instalar el APK en tu telefono

Con el celular conectado por USB (modo "depuracion USB" activado):

```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

O simplemente pasas el `.apk` al telefono (por Drive, correo, USB) y
lo abris desde el explorador de archivos. Android te pedira permiso
para instalar de "origenes desconocidos".

## Paso 6 - Subir version para una nueva release

Antes de cada nuevo build de release, **incrementa** los dos numeros
del `app.json`:

```jsonc
"android": { "versionCode": 2 },     // entero, +1 cada vez
"version":  "1.0.1",                  // semver visible al usuario
```

Despues volve a correr `npm run prebuild` y `npm run apk:release`.

## Cambiar el backend en builds futuros

Si moves el VPS a otra IP o lo pones detras de HTTPS, edita:

1. `.env` -> `EXPO_PUBLIC_API_BASE_URL=...`
2. `app.json` -> `extra.apiBaseUrl` (espeja el `.env` por si algun
   modulo decide leer de `expo-constants`).
3. Si pasa a HTTPS, podes sacar `usesCleartextTraffic` del bloque
   `expo-build-properties` del `app.json` para mayor seguridad.

Volver a correr `npm run prebuild && npm run apk:release` para
regenerar el bundle con la URL nueva.

## Troubleshooting comun

- **"Could not find expo-build-properties"** - corre `npm install` y
  volve a hacer `npm run prebuild`.
- **"CLEARTEXT communication not permitted"** - el `usesCleartextTraffic`
  del `app.json` no se aplico. Borra la carpeta `android/` y corre
  `npm run prebuild` de nuevo.
- **"Could not connect to 89.117.58.101"** - chequea que el VPS este
  arriba (`ssh` o `ping`) y que el firewall permita el puerto 8080.
- **"Network request failed"** dentro de la app pero ping al VPS OK -
  reinstala el APK (la primera version puede haber cacheado un base
  URL viejo).
