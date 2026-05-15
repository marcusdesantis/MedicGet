# MedicGet — Mobile

App nativa de MedicGet construida con **Expo + React Native + TypeScript + NativeWind**. Paridad 100% con el portal web (`medicget-frontend`): mismos endpoints del backend, mismos DTOs, mismas reglas de negocio.

```
medicget-mobile/
├── app/                    Rutas (file-based) — expo-router
│   ├── (auth)/             Login, registro, verificación de email, recover
│   ├── (main)/             Área autenticada — un grupo por rol
│   │   ├── (patient)/      Tabs paciente + detalle de cita + chat + pago
│   │   ├── (doctor)/       Tabs médico + detalle + chat + horarios + reportes
│   │   ├── (clinic)/       Tabs clínica + médicos + pagos + reportes + especialidades
│   │   └── (admin)/        Tabs superadmin + usuarios + planes + suscripciones + config
│   ├── _layout.tsx         Root layout (Stack + AuthProvider)
│   └── index.tsx           Bootstrap router (redirige según token)
├── components/
│   ├── layout/             DashboardHeader, ProtectedRoute, AuthLayout
│   ├── ui/                 Avatar(Uploader), Button, Modal, SectionCard, Tabs, ...
│   └── reviews/            ReviewModal
├── context/                AuthContext (login/register/verify/logout/refresh)
├── hooks/                  useApi (loading/ready/error + refetch)
├── lib/                    api.ts (DTOs + endpoints), format, locations, statusConfig, ...
├── services/               http.ts (Axios + interceptor JWT + listener 401)
└── app.json                Expo config (scheme: medicget)
```

## Stack

| Pieza | Versión | Notas |
|---|---|---|
| Expo | ~52.0.0 | New Architecture habilitada |
| React Native | 0.76.9 | |
| expo-router | ~4.0.0 | File-based routing + typed routes |
| NativeWind | ^4.1.23 | Tailwind classes en JSX, mismo `tailwind.config.js` que el web |
| Axios | ^1.7.9 | Mismo cliente que el web, con token cacheado en memoria |
| expo-secure-store | ~14.0.1 | JWT persistido seguro (Keychain/Keystore) |
| expo-image-picker | ~16.0.6 | Avatar uploader + adjuntos imagen en chat |
| expo-document-picker | ~13.0.3 | Adjuntos PDF en chat |
| expo-clipboard | ~7.0.1 | Copiar passwords temporales (admin) |
| lucide-react-native | ^0.460.0 | Iconografía |

## Requisitos

- **Node.js** 20+ (mismo entorno que el frontend web).
- **Expo CLI** moderno (viene con el repo vía `npx expo`).
- Para correr en device físico: app **Expo Go** instalada.
- Para builds nativos: **Android Studio** (emulator) y/o **Xcode** (simulator). El proyecto usa nueva arquitectura — `prebuild` regenera carpetas nativas si querés EAS Build.
- Backend `medicget-nextjs` corriendo en `:8080` (o accesible desde el dispositivo).

## Variables de entorno

Crear `.env` en la raíz del proyecto:

```bash
# URL pública del backend. Las claves prefijadas con EXPO_PUBLIC_ se
# inyectan en el bundle del cliente — NO uses esto para secretos.
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1
```

Notas por entorno:

- **Emulador Android**: `http://10.0.2.2:8080/api/v1` (alias del host).
- **Emulador iOS**: `http://localhost:8080/api/v1`.
- **Dispositivo físico**: usar la IP LAN de tu máquina, p.ej. `http://192.168.1.50:8080/api/v1`.
- **Producción**: tu dominio HTTPS, p.ej. `https://api.medicget.com/api/v1`.

Si no se define la variable, el cliente usa el default `http://10.0.2.2:8080/api/v1` ([services/http.ts](services/http.ts)).

## Cómo arrancar

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar el .env (ver arriba)

# 3. Arrancar Metro
npm run start
```

Una vez Metro corriendo, el menú interactivo ofrece:

| Tecla | Acción |
|---|---|
| `a` | Abrir en Android (emulador o device USB) |
| `i` | Abrir en iOS Simulator (solo Mac) |
| `w` | Abrir en web (modo dev — útil para iteración rápida) |
| Escaneo QR | Abrir en device físico con Expo Go |

Atajos directos:

```bash
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npm run typecheck  # tsc --noEmit
```

## Convenciones del proyecto

### Routing por rol

`(auth)` es la zona pública (login, registro, verificación, recover). `(main)` es la autenticada y se divide en `(patient)` / `(doctor)` / `(clinic)` / `(admin)` — cada grupo es un **Tabs** layout protegido por [`ProtectedRoute`](components/layout/ProtectedRoute.tsx) que verifica `user.role`. Si el rol del token no coincide con el grupo, redirige al home del rol correcto.

Los grupos en paréntesis son invisibles en la URL: `medicget://(main)/(patient)/appointments` se accede como `/appointments` desde dentro del grupo. Los deep-links externos (PayPhone return, etc.) usan rutas absolutas, p.ej. `medicget://payment/return?appointmentId=...`.

### Comunicación con el backend

Todo pasa por [`services/http.ts`](services/http.ts):

- Instancia Axios única con `baseURL` desde `EXPO_PUBLIC_API_BASE_URL`.
- Token JWT cacheado **en memoria** (`cachedToken`) e inyectado por el interceptor de request. La persistencia real vive en `expo-secure-store` ([`lib/storage.ts`](lib/storage.ts)).
- Interceptor de response captura 401 fuera de login/register, limpia el token y dispara listeners (`onUnauthorized`) — el `AuthContext` se suscribe para borrar el `user` y la raíz redirige a login.
- Helpers tipados: `apiGet<T>`, `apiPost<T>`, `apiPatch<T>`, `apiDelete<T>`.

Las colecciones de endpoints viven en [`lib/api.ts`](lib/api.ts) (`authApi`, `usersApi`, `doctorsApi`, `patientsApi`, `appointmentsApi`, `chatApi`, `paymentApi`, `dashboardApi`, `clinicsApi`, `adminApi`, `notificationsApi`). Cada función devuelve `ApiOk<T>` — el `data` real está en `.data.data` para listados paginados.

### Estado de pantallas

[`hooks/useApi.ts`](hooks/useApi.ts) maneja loading/ready/error con discriminated unions:

```tsx
const { state, refetch } = useApi(() => doctorsApi.list({ available: 'true' }), []);

if (state.status === 'loading') return <ActivityIndicator />;
if (state.status === 'error')   return <Alert>{state.error.message}</Alert>;
return <List items={state.data.data} />;
```

### Auth

[`context/AuthContext.tsx`](context/AuthContext.tsx) expone:

- `user` (mapeado a un shape simple `{ id, email, role, name, dto }`).
- `login(email, password)`, `register(body)`, `verifyEmail({code,email})`, `logout()`, `refreshMe()`.
- `loading` durante el bootstrap inicial (lectura de SecureStore + `/auth/me`).

### Styling

NativeWind con `tailwind.config.js` espejado del web. Las clases que usamos son las nativas de Tailwind — para colores estamos en la paleta default (`bg-blue-600`, `text-rose-700`, etc.). Dark mode automático via `dark:` (lo maneja el OS, no hay toggle manual aún).

### Iconos

Lucide vía `lucide-react-native`. Casi todos los iconos del web tienen equivalente exacto en el paquete nativo. Si algún icono no existe, sustituir por uno semánticamente cercano.

## Features implementadas (paridad con web)

### Paciente
- Dashboard con KPIs + próxima cita + notificaciones
- Búsqueda de médicos con filtros (texto, especialidad, disponibilidad)
- Detalle de médico + reserva (modalidad, día, slot, notas)
- Mis citas con tabs por status
- Detalle de cita: timeline, presencial check-in, doble validación, ficha médica read-only
- Chat en vivo (texto + imagen + PDF + recibos visto)
- Pago PayPhone + confirmación vía deep-link `medicget://payment/return`
- Modal de calificación (★1-5 + comentario + público/privado)
- Historial médico editable (alergias, condiciones, medicamentos, DOB, tipo de sangre)
- Perfil con avatar uploader + selector país/provincia
- Notificaciones con mark/mark-all

### Médico
- Dashboard con KPIs, agenda de hoy, gráfico semanal, reseñas recientes
- Agenda con tabs por status + acciones por modalidad
- Horarios semanales con plantilla rápida
- Pacientes atendidos con detalle clínico
- Perfil profesional completo (especialidad, licencia, experiencia, precio, modalidades multi-select, toggle disponibilidad)
- Detalle de cita + ficha médica editable + presencial check-in
- Chat (mismo que paciente)
- Pagos recibidos con KPIs (cobrado/neto/comisión)
- Reportes con tendencias, distribución y top pacientes

### Clínica
- Dashboard con KPIs financieros + top médicos
- Citas globales de la clínica con cancelación
- Gestión de médicos: asociar existente o crear nuevo con password temporal
- Pacientes atendidos en la clínica
- Perfil comercial + logo uploader + representante legal
- Pagos con KPIs (cobrado/neto/comisión/pendiente) + historial
- Reportes con tendencias y top médicos
- Especialidades agrupadas por médico (auto-derivadas)

### Superadmin
- Dashboard con KPIs globales (usuarios, citas, revenue, suscripciones)
- Usuarios: filtros + impersonar + crear + editar + suspender/reactivar/eliminar
- Planes: editar nombre/precio/módulos + activar/desactivar
- Suscripciones: extender + cambiar plan (filtrado por audiencia)
- Configuración: editar runtime settings agrupadas por categoría con toggle ver para secretos
- Notificaciones

## Diferencias intencionales con el web

- **Sin LocationPicker con mapa interactivo**: usamos `CountryProvinceSelect` + dirección de texto. Sin Mapbox/Leaflet en mobile por ahora.
- **Sin descarga CSV** en reportes: en mobile mostramos los gráficos y agregados sin export. Para CSV usar el web.
- **Sin presets SMTP por provider** en admin/settings: las settings se editan con inputs manuales.
- **PayPhone abre browser externo**: el web usa el widget "Cajita". En mobile abrimos PayPhone vía `Linking.openURL` y volvemos vía deep-link.
- **Doctor Setup omitido**: el perfil del médico cubre los mismos campos. No hay onboarding aparte post-registro.
- **AdminPaymentsPage omitida**: es un wrapper trivial sobre la misma tabla que clínica/médico — los pagos se ven desde esos roles.

## TypeScript

`strict: true` y `noUncheckedIndexedAccess: true` en `tsconfig.json`. Si un patch agrega errores, correr `npm run typecheck` antes de commitear.

## Builds nativos

Para generar APK/IPA hace falta cuenta EAS (gratis) y configurar `eas.json`. Comando típico:

```bash
npx expo prebuild     # genera carpetas android/ y ios/
npx eas build -p android --profile preview
npx eas build -p ios --profile preview
```

El `scheme: "medicget"` ya está configurado en `app.json` para los deep-links de PayPhone return. Si cambiás el scheme, actualizar también el `responseUrl` que se manda en [`paymentApi.checkout`](app/(main)/(patient)/appointment/[id]/index.tsx).

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| "Network Error" en emulador Android | URL apunta a `localhost` | Usar `http://10.0.2.2:8080` |
| "Network Error" en device físico | Backend no expuesto en LAN | Usar IP LAN del host y abrir el puerto 8080 |
| 401 inmediato post-login | Token expirado / `JWT_SECRET` distinto entre dev y mobile | Verificar que ambos usan el mismo backend |
| El deep-link de pago no abre la app | Scheme mal configurado | Verificar `scheme: "medicget"` en `app.json` y rebuild |
| Texto cortado en pantallas largas | Falta `ScrollView` | Usar `<Screen scroll>` (default) o envolver en `ScrollView` manualmente |
| Adjuntos PDF muy grandes | Excede 5 MB | El backend rechaza > 5 MB; el cliente debería avisar antes (ya implementado en chat) |

## Convenciones de código

- Componentes en PascalCase, ficheros también (`PatientDashboard.tsx`).
- Las funciones helper no exportadas van al final del archivo.
- Comentarios en español cuando explican decisiones de negocio; código y nombres de variables en inglés.
- Errores de API se extraen con el patrón:
  ```tsx
  const msg = (err as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error?.message ?? 'Mensaje fallback';
  ```
- Modales son bottom-sheets vía `<Modal>` ([components/ui/Modal.tsx](components/ui/Modal.tsx)) — no usar `react-native`'s `Alert` para diálogos con contenido rico (sí para confirmaciones simples).
