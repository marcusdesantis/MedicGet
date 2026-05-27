# Calibración de la verificación automática ACESS

MedicGet puede verificar automáticamente la habilitación médica de un doctor
consultando el registro público de **ACESS** (Agencia de Aseguramiento de la
Calidad de los Servicios de Salud y Medicina Prepagada, Ecuador) por cédula.

## Estado actual

El provider ACESS vive en
[`medicget-nextjs/packages/shared/src/license-verifier.ts`](../medicget-nextjs/packages/shared/src/license-verifier.ts).

Está **deshabilitado por default** (`ACESS_ENABLED=false`). Mientras esté off,
toda verificación devuelve `UNAVAILABLE` y el médico cae al **flujo manual**
(subir documento → admin aprueba). Esto es seguro: nada se rompe.

**Por qué está off:** el scraper fue escrito contra las convenciones estándar
de PrimeFaces/JSF pero **no se pudo testear contra el sitio real** porque los
servidores `.gob.ec` bloquean IPs fuera de Ecuador. Hay que calibrarlo desde
el VPS (que sí los alcanza) antes de confiar en él.

## Pasos de calibración (desde el VPS en Ecuador)

### 1. Confirmar que el VPS alcanza ACESS

```bash
curl -I "http://www.calidadsalud.gob.ec/acess-app-servicio-ciudadano/public/titulo/consulta.jsf"
```

Si no responde, probá las URLs alternativas:
- `https://saccs.acess.gob.ec/publico/talentohumano/consultareg/`
- `http://www.acess.gob.ec/acess-app-servicio-ciudadano/public/titulo/consulta.jsf`

Ajustá `ACESS_BASE_URL` a la que funcione.

### 2. Inspeccionar el formulario real

```bash
curl -s "$ACESS_BASE_URL" | grep -iE 'javax.faces.ViewState|<form|<input|btnConsultar|identificacion'
```

Anotá los valores reales y comparalos con los asumidos en `license-verifier.ts`:

| Constante (env override) | Valor asumido | Verificar |
|---|---|---|
| `ACESS_FORM_ID`     | `formConsulta`                  | ¿el `<form>` tiene ese `id`? |
| `ACESS_INPUT_NAME`  | `formConsulta:identificacion`   | ¿el `name` del campo de cédula? |
| `ACESS_BUTTON_NAME` | `formConsulta:btnConsultar`     | ¿el `name` del botón Consultar? |

Si difieren, seteá las env vars con los valores reales (no hace falta recompilar).

### 3. Capturar el POST real

Abrí el sitio en un navegador con DevTools → pestaña Network → hacé una
consulta con una cédula de prueba → mirá el request POST:
- ¿Es `application/x-www-form-urlencoded`? ¿Manda `javax.faces.partial.ajax`?
- Copiá el form-data exacto y comparalo con `buildSearchBody()`.

### 4. Ver el formato de la respuesta

- Si la respuesta es un **partial-response XML de PrimeFaces**
  (`<partial-response>...<update>...`), `parseResult()` ya busca keywords
  dentro del texto — suele funcionar igual.
- Anotá las frases EXACTAS que aparecen para:
  - un profesional **habilitado** (ej: "HABILITADO", "VIGENTE", "REGISTRADO")
  - un profesional **no encontrado** (ej: "No se han encontrado")
  - un profesional **suspendido/inactivo**

  Ajustá las listas `positive` / `negative` / `notFound` en `parseResult()`
  con las frases reales.

### 5. Probar contra cédulas reales

Con `ACESS_ENABLED=true` en un entorno de staging, probá:
- Una cédula de un médico habilitado conocido → debe dar `autoVerified:true`.
- Una cédula que no sea médico → debe dar `autoVerified:false` (cae a manual).
- Una cédula con un dígito cambiado → rechazo por módulo 10 (ni siquiera consulta).

### 6. Activar en producción

En `/proyectos/opt/medicget/.env`:

```env
ACESS_ENABLED=true
ACESS_BASE_URL=<la URL que funcionó>
# Solo si los nombres de campo difieren de los defaults:
ACESS_FORM_ID=...
ACESS_INPUT_NAME=...
ACESS_BUTTON_NAME=...
```

Rebuild de svc-doctor desde Jenkins (o `docker compose up -d --build svc-doctor`).

## Garantías de seguridad

- **Fail-safe:** cualquier error/timeout/formato inesperado → `UNAVAILABLE` →
  flujo manual. El scraper roto nunca bloquea a un médico legítimo.
- **Match inequívoco:** solo auto-aprueba si la cédula aparece + hay señal
  positiva de habilitación + sin señales negativas + (si se pasó) el nombre
  coincide. Cualquier ambigüedad → manual.
- **Auditoría:** cada auto-aprobación guarda el snapshot de ACESS en
  `Doctor.licenseVerificationEvidence` para responder "¿por qué se aprobó?".
- **Timeout:** 8s duros para no colgar el registro.

## Si ACESS nunca funciona

Es una opción válida dejar `ACESS_ENABLED=false` permanentemente y operar 100%
con revisión manual de documentos — que ya está implementada y es robusta.
La verificación automática es una optimización, no un requisito.
