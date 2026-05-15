/**
 * Patient — Checkout PayPhone. Espejo del PaymentCheckoutPage web.
 *
 * El widget "Cajita de Pagos" de PayPhone es JavaScript puro: vive en
 * el DOM del navegador, no es una página redirigible. Para mobile lo
 * embebemos en un WebView con un HTML self-contained que:
 *
 *   1. Carga el SDK de PayPhone desde su CDN.
 *   2. Instancia `PPaymentButtonBox` con los datos de sesión que nos
 *      devolvió el backend.
 *   3. PayPhone redirige a `responseUrl` (medicget://payment/return?...)
 *      cuando termina. El WebView intercepta esa URL con
 *      `onShouldStartLoadWithRequest`, cierra la pantalla y navega a
 *      `/payment/return` para que el backend confirme el cobro.
 *
 * Stub mode (sin credenciales PayPhone configuradas): el backend
 * devuelve `stubMode: true` y mostramos un botón "Confirmar (dev)" que
 * llama a `paymentApi.confirm({ fakeOk: true })`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  ShieldCheck,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Screen } from '@/components/ui/Screen';
import { SectionCard } from '@/components/ui/SectionCard';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import {
  appointmentsApi,
  paymentApi,
  type AppointmentDto,
  type CheckoutSessionDto,
  type PaymentBreakdownDto,
} from '@/lib/api';
import { profileInitials } from '@/lib/format';

interface CheckoutSessionExt extends CheckoutSessionDto {
  breakdown?: PaymentBreakdownDto;
}

/**
 * HTML self-contained que carga el SDK de PayPhone Cajita y monta el
 * widget. PayPhone se hace cargo del UI del pago. Cuando termina,
 * redirige a `responseUrl` y el WebView intercepta esa navegación.
 */
function buildCheckoutHtml(session: CheckoutSessionDto): string {
  // Escape básico para que ningún campo de la sesión pueda romper el JS.
  // PayPhone normalmente devuelve solo letras/números/guiones, pero
  // mantenemos el escape como defensa en profundidad.
  const esc = (s: string) =>
    String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Pago — PayPhone</title>
  <link rel="stylesheet" href="https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.css">
  <style>
    html, body { margin: 0; padding: 0; font-family: -apple-system, system-ui, sans-serif; background: #f8fafc; }
    body { padding: 16px; }
    .container { max-width: 600px; margin: 0 auto; }
    .loading { display: flex; align-items: center; justify-content: center; padding: 64px 16px; color: #94a3b8; }
    .error { background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
    #pp-button { min-height: 200px; }
  </style>
  <script>
    /* Interceptor de redirects. PayPhone, al terminar el pago, redirige
       el navegador a \`responseUrl\`. En Android el handler nativo de RN
       no siempre dispara para redirects programáticos — por eso lo
       atrapamos acá mismo en JS antes de que el WebView intente
       navegar. Postamos un mensaje al lado nativo con la URL completa
       (que incluye los query params de PayPhone: id, clientTransactionId,
       status...) y bloqueamos la navegación real. */
    (function () {
      function post(type, payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || null }));
        }
      }
      var SENTINEL = 'medicget-payment-return.invalid';
      function isReturnUrl(u) {
        return typeof u === 'string' && u.indexOf(SENTINEL) !== -1;
      }
      // Override window.location setter (href, replace, assign).
      try {
        var origAssign  = window.location.assign.bind(window.location);
        var origReplace = window.location.replace.bind(window.location);
        window.location.assign = function (u) {
          if (isReturnUrl(u)) { post('return', u); return; }
          origAssign(u);
        };
        window.location.replace = function (u) {
          if (isReturnUrl(u)) { post('return', u); return; }
          origReplace(u);
        };
        // El setter de href requiere defineProperty para sobreescribir.
        var descriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
        if (descriptor && descriptor.set) {
          var origSet = descriptor.set;
          Object.defineProperty(window.location, 'href', {
            set: function (u) {
              if (isReturnUrl(u)) { post('return', u); return; }
              origSet.call(window.location, u);
            },
            get: function () { return descriptor.get.call(window.location); },
          });
        }
      } catch (err) {
        // Si el override falla por alguna razón del WebView, dejamos
        // el flow por defecto — el handler nativo igual recoge el
        // intento de navegación.
      }
      // Captura errores top-level para no quedar en pantalla blanca
      // sin diagnóstico.
      window.addEventListener('error', function (e) {
        post('error', 'JS error: ' + (e && e.message ? e.message : 'desconocido'));
      });
      window.addEventListener('unhandledrejection', function (e) {
        post('error', 'JS rejection: ' + (e && e.reason ? String(e.reason) : 'desconocido'));
      });
    })();
  </script>
</head>
<body>
  <div class="container">
    <div id="loading" class="loading">Cargando pasarela…</div>
    <div id="error" class="error" style="display:none"></div>
    <div id="pp-button"></div>
  </div>
  <script type="module" src="https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js"></script>
  <script>
    (function () {
      function post(type, payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || null }));
        }
      }

      function showError(msg) {
        var el = document.getElementById('error');
        el.textContent = msg;
        el.style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        post('error', msg);
      }

      function mountWidget() {
        if (!window.PPaymentButtonBox) return false;
        try {
          new window.PPaymentButtonBox({
            token:               '${esc(session.token)}',
            storeId:             '${esc(session.storeId)}',
            amount:              ${session.amount},
            amountWithoutTax:    ${session.amountWithoutTax},
            amountWithTax:       ${session.amountWithTax},
            tax:                 ${session.tax},
            service:             ${session.service},
            tip:                 ${session.tip},
            currency:            '${esc(session.currency)}',
            clientTransactionId: '${esc(session.clientTransactionId)}',
            reference:           '${esc(session.reference)}',
            lang:                'es',
            defaultMethod:       'card',
            timeZone:            -5,
          }).render('pp-button');
          document.getElementById('loading').style.display = 'none';
          post('ready');
          return true;
        } catch (err) {
          showError('No se pudo iniciar el pago: ' + (err && err.message ? err.message : 'error desconocido'));
          return false;
        }
      }

      // El SDK se carga como ESM module — esperamos a que defina el global.
      var attempts = 0;
      var interval = setInterval(function () {
        attempts++;
        if (mountWidget()) {
          clearInterval(interval);
        } else if (attempts > 100) {
          // ~10 segundos sin SDK — abortamos.
          clearInterval(interval);
          showError('No se pudo cargar el SDK de PayPhone. Revisá tu conexión.');
        }
      }, 100);
    })();
  </script>
</body>
</html>`;
}

export default function PaymentCheckout() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const apptState = useApi<AppointmentDto>(
    () => appointmentsApi.getById(id!),
    [id],
  );

  const [session, setSession] = useState<CheckoutSessionExt | null>(null);
  const [breakdown, setBreakdown] = useState<PaymentBreakdownDto | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stubConfirming, setStubConfirming] = useState(false);
  const intercepted = useRef(false);

  // PayPhone rechaza `responseUrl` que no sea HTTPS (es razonable —
  // valida la URL antes de aceptar la transacción). Usamos un dominio
  // sentinel HTTPS reservado (`.invalid` está garantizado por RFC 6761
  // a no resolver nunca) que nunca contacta a un servidor real. El
  // WebView intercepta la navegación a esa URL con
  // `onShouldStartLoadWithRequest` antes de que falle el DNS, extrae
  // los query params (`?id=...&clientTransactionId=...`) y navega a la
  // pantalla nativa de confirmación.
  const responseUrl = useMemo(
    () =>
      `https://medicget-payment-return.invalid/return?appointmentId=${id}`,
    [id],
  );

  // Solicitamos la sesión al backend una vez que se cargó la cita.
  useEffect(() => {
    if (!id) return;
    if (apptState.state.status !== 'ready') return;
    if (apptState.state.data.payment?.status === 'PAID') return;
    if (apptState.state.data.status === 'CANCELLED') return;
    if (session) return;

    let cancelled = false;
    (async () => {
      setLoadingCheckout(true);
      setError(null);
      try {
        const res = await paymentApi.checkout(id, { responseUrl });
        if (cancelled) return;
        setSession(res.data);
        // El backend puede devolver `breakdown` en `res.data.breakdown` aunque
        // el tipo CheckoutSessionDto no lo tipea explícitamente.
        const bd = (res.data as unknown as { breakdown?: PaymentBreakdownDto }).breakdown;
        if (bd) setBreakdown(bd);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ??
          'No se pudo iniciar el pago.';
        setError(msg);
      } finally {
        if (!cancelled) setLoadingCheckout(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, apptState.state, responseUrl, session]);

  // Stub mode — el backend nos avisa que no hay credenciales. Mostramos
  // un botón para confirmar directamente sin pasar por PayPhone.
  const handleStubConfirm = async () => {
    if (!id) return;
    setStubConfirming(true);
    setError(null);
    try {
      await paymentApi.confirm(id, { fakeOk: true });
      router.replace(`/(main)/(patient)/payment/return?appointmentId=${id}` as never);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ??
        'No se pudo confirmar el pago (stub).';
      setError(msg);
      setStubConfirming(false);
    }
  };

  /**
   * Detecta si el URL es el sentinel de retorno (sea por click del
   * usuario o redirect programático de PayPhone) y, si lo es, navega
   * a la pantalla nativa con los query params que trae PayPhone:
   *   ?id=<payphoneId>&clientTransactionId=<appointmentId>&status=...
   *
   * Devuelve true cuando interceptó (para que el caller corte la
   * navegación / ignore el evento siguiente).
   */
  const tryInterceptReturn = useCallback(
    (url: string): boolean => {
      if (intercepted.current) return true;
      if (!url) return false;
      // El sentinel es `https://medicget-payment-return.invalid/return?...`
      if (!url.startsWith('https://medicget-payment-return.invalid')) {
        return false;
      }
      intercepted.current = true;
      // Extraemos los query params que PayPhone agregó (id=<payphoneId>,
      // clientTransactionId=<appointmentId>, status=...).
      const qIdx = url.indexOf('?');
      const qs = qIdx >= 0 ? url.slice(qIdx + 1) : '';
      const params = new Map<string, string>();
      for (const pair of qs.split('&')) {
        if (!pair) continue;
        const eq = pair.indexOf('=');
        const k = eq >= 0 ? decodeURIComponent(pair.slice(0, eq)) : pair;
        const v = eq >= 0 ? decodeURIComponent(pair.slice(eq + 1)) : '';
        params.set(k, v);
      }
      const target = new URLSearchParams();
      const appointmentId = params.get('appointmentId') ?? id ?? '';
      if (appointmentId) target.set('appointmentId', appointmentId);
      const payphoneId = params.get('id');
      if (payphoneId) target.set('id', payphoneId);
      const ctx = params.get('clientTransactionId');
      if (ctx) target.set('clientTransactionId', ctx);
      router.replace(
        `/(main)/(patient)/payment/return?${target.toString()}` as never,
      );
      return true;
    },
    [id, router],
  );

  /**
   * iOS y Android modernos disparan este callback en cada intento de
   * navegación, sea por click o por redirect programático. Devolvemos
   * false para cortar la navegación a nuestro sentinel ANTES de que
   * el WebView intente resolver el DNS (que fallaría con
   * `.invalid`).
   */
  const handleShouldStartLoad = (req: { url: string }): boolean => {
    if (tryInterceptReturn(req.url)) return false;
    return true;
  };

  /**
   * Fallback para Android: en algunas versiones de react-native-webview,
   * `onShouldStartLoadWithRequest` no dispara para redirects
   * programáticos (window.location = ...). `onNavigationStateChange`
   * sí ve toda navegación — interceptamos acá como red de seguridad.
   */
  const handleNavStateChange = (state: { url: string }) => {
    tryInterceptReturn(state.url);
  };

  /**
   * El HTML embebido posta mensajes vía `window.ReactNativeWebView.postMessage`
   * en tres casos:
   *   - type: 'ready'   → el widget se montó OK
   *   - type: 'error'   → falla al cargar el SDK o ejecutar JS
   *   - type: 'return'  → PayPhone redirigió a la URL sentinel; el
   *                       payload trae la URL completa con los query
   *                       params. Lo usamos para navegar a la pantalla
   *                       nativa de confirmación.
   */
  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; payload?: string };
      if (msg.type === 'return' && msg.payload) {
        tryInterceptReturn(msg.payload);
      } else if (msg.type === 'error' && msg.payload) {
        setError(msg.payload);
      }
    } catch {
      /* ignore */
    }
  };

  const handleCancelReservation = () => {
    if (!id) return;
    RNAlert.alert(
      'Cancelar reserva',
      'El horario quedará liberado y no podrás recuperarlo. ¿Continuar?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentsApi.update(id, { status: 'CANCELLED' });
              router.replace('/(main)/(patient)/appointments' as never);
            } catch {
              /* ignore */
            }
          },
        },
      ],
    );
  };

  if (apptState.state.status === 'loading') {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </Screen>
    );
  }

  if (apptState.state.status === 'error') {
    return (
      <Screen>
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1.5 mb-3">
          <ArrowLeft size={14} color="#475569" />
          <Text className="text-sm text-slate-500">Volver</Text>
        </Pressable>
        <Alert variant="error">{apptState.state.error.message}</Alert>
      </Screen>
    );
  }

  const a = apptState.state.data;
  const profile = a.doctor?.user?.profile;
  const docName = `Dr. ${[profile?.firstName, profile?.lastName].filter(Boolean).join(' ')}`.trim();
  const alreadyPaid = a.payment?.status === 'PAID';
  const cancelled = a.status === 'CANCELLED';

  // Mostrar countdown del plazo de pago.
  const expiresAt = session?.expiresAt
    ? new Date(session.expiresAt).getTime()
    : null;

  return (
    <Screen scroll={!session?.stubMode === false}>
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={6}
          className="w-9 h-9 rounded-lg items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <ArrowLeft size={16} color="#475569" />
        </Pressable>
        <Text className="text-xl font-bold text-slate-800 dark:text-white">
          Pagar reserva
        </Text>
      </View>

      {alreadyPaid ? (
        <Alert variant="success">
          <View className="flex-row items-center gap-2">
            <ShieldCheck size={14} color="#10b981" />
            <Text className="text-emerald-700 dark:text-emerald-300 text-sm flex-1">
              Esta cita ya está pagada.
            </Text>
            <Pressable
              onPress={() => router.replace('/(main)/(patient)/appointments' as never)}>
              <Text className="text-emerald-700 text-xs font-semibold">
                Ver mis citas
              </Text>
            </Pressable>
          </View>
        </Alert>
      ) : cancelled ? (
        <Alert variant="error">
          La cita fue cancelada. No se puede pagar.
        </Alert>
      ) : (
        <View className="gap-4">
          {/* Resumen */}
          <SectionCard>
            <View className="flex-row items-center gap-3">
              <Avatar
                initials={profileInitials(profile, 'DR')}
                imageUrl={profile?.avatarUrl ?? null}
                size="lg"
                shape="rounded"
                variant="blue"
              />
              <View className="flex-1 min-w-0">
                <Text className="font-bold text-slate-800 dark:text-white">
                  {docName}
                </Text>
                <Text className="text-xs text-blue-600 font-medium mt-0.5">
                  {a.doctor?.specialty}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-1">
                  {new Date(a.date).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  · {a.time}
                </Text>
              </View>
            </View>

            <View className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 gap-1.5">
              {breakdown ? (
                <>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-slate-600 dark:text-slate-300">
                      Honorarios
                    </Text>
                    <Text className="text-sm text-slate-700 dark:text-slate-200">
                      ${breakdown.baseAmount.toFixed(2)}
                    </Text>
                  </View>
                  {breakdown.platformFee > 0 ? (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-slate-600 dark:text-slate-300">
                        Comisión plataforma ({breakdown.feePct}%)
                      </Text>
                      <Text className="text-sm text-slate-700 dark:text-slate-200">
                        ${breakdown.platformFee.toFixed(2)}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
              <View className="flex-row justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <Text className="text-base font-bold text-slate-800 dark:text-white">
                  Total
                </Text>
                <Text className="text-base font-bold text-slate-800 dark:text-white">
                  ${(breakdown?.totalAmount ?? a.price).toFixed(2)}
                </Text>
              </View>
            </View>
          </SectionCard>

          {/* Countdown */}
          {expiresAt ? <Countdown expiresAt={expiresAt} /> : null}

          {error ? <Alert variant="error">{error}</Alert> : null}

          {/* Loading checkout */}
          {loadingCheckout || !session ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-sm text-slate-500 mt-3">
                Cargando pasarela…
              </Text>
            </View>
          ) : session.stubMode ? (
            <SectionCard>
              <Alert variant="info">
                <Text className="text-blue-700 dark:text-blue-300 text-sm">
                  <Text className="font-semibold">Modo desarrollo:</Text> el
                  sistema no tiene credenciales de PayPhone configuradas. Al
                  continuar, la cita se aprobará automáticamente sin cobro
                  real.
                </Text>
              </Alert>
              <View className="mt-4">
                <Button
                  onPress={handleStubConfirm}
                  loading={stubConfirming}
                  variant="success"
                  fullWidth>
                  <View className="flex-row items-center gap-2">
                    <CheckCircle size={16} color="#fff" />
                    <Text className="text-white font-semibold">
                      Confirmar pago (modo dev)
                    </Text>
                  </View>
                </Button>
              </View>
            </SectionCard>
          ) : (
            <View
              className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white"
              style={{ height: 480 }}>
              <WebView
                originWhitelist={['*']}
                source={{ html: buildCheckoutHtml(session) }}
                onShouldStartLoadWithRequest={handleShouldStartLoad}
                onNavigationStateChange={handleNavStateChange}
                onMessage={handleMessage}
                // Capturamos errores nativos del WebView para
                // mostrarlos en pantalla en vez de la página default
                // "Error loading page" de Android — así sabemos qué URL
                // está fallando.
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  setError(
                    `WebView error: ${nativeEvent.code ?? '?'} ${nativeEvent.description ?? ''} (url: ${nativeEvent.url ?? '?'})`,
                  );
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  setError(
                    `HTTP ${nativeEvent.statusCode} on ${nativeEvent.url}`,
                  );
                }}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                mixedContentMode="always"
                renderLoading={() => (
                  <View className="absolute inset-0 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563eb" />
                  </View>
                )}
              />
            </View>
          )}

          <Pressable
            onPress={handleCancelReservation}
            className="flex-row items-center justify-center gap-1.5 py-3">
            <Text className="text-sm text-rose-600 font-medium">
              Cancelar reserva
            </Text>
          </Pressable>

          <View className="flex-row items-center justify-center gap-1.5">
            <ShieldCheck size={11} color="#94a3b8" />
            <Text className="text-[10px] text-slate-400">
              Pago procesado con cifrado TLS · No almacenamos datos de tu
              tarjeta
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

function Countdown({ expiresAt }: { expiresAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const m = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const expired = secondsLeft <= 0;

  return (
    <View
      className={`rounded-2xl border p-3 flex-row items-center gap-2 ${
        expired
          ? 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20'
          : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
      }`}>
      <Clock size={16} color={expired ? '#e11d48' : '#d97706'} />
      <View className="flex-1">
        <Text
          className={`text-sm font-semibold ${
            expired
              ? 'text-rose-700 dark:text-rose-300'
              : 'text-amber-800 dark:text-amber-200'
          }`}>
          {expired
            ? 'La reserva expiró'
            : `Tu reserva expira en ${m}:${String(ss).padStart(2, '0')}`}
        </Text>
        {!expired ? (
          <Text className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
            Si no completás el pago a tiempo, el horario se libera.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
