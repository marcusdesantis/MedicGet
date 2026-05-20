/**
 * SubscribeCheckoutModal (mobile) — popup PayPhone para comprar/cambiar
 * un plan de suscripcion. Espejo movil del SubscribeCheckoutModal web.
 *
 * Cubre 3 ramas segun lo que devuelva /subscriptions/checkout:
 *   1) FREE: el backend ya activa la suscripcion, mostramos pantalla
 *      de exito y cerramos.
 *   2) stubMode (sin credenciales PayPhone): mostramos boton "Activar
 *      plan (dev)" que llama a /subscriptions/confirm con fakeOk.
 *   3) Plan pago real: abrimos WebView con el SDK Cajita de PayPhone
 *      montado inline. Cuando PayPhone redirige al sentinel
 *      `https://medicget-subscription-return.invalid/return?...`, el
 *      WebView lo intercepta, cierra el modal y llama a
 *      /subscriptions/confirm con los parametros.
 *
 * Identico patron al checkout de citas en
 * `app/(main)/(patient)/payment/checkout/[id].tsx`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle,
  CreditCard,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { SectionCard } from '@/components/ui/SectionCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import {
  subscriptionsApi,
  type PlanDto,
  type PaymentBreakdownDto,
  type SubscriptionCheckoutResponse,
} from '@/lib/api';

/** Sentinel HTTPS reservado. `.invalid` nunca resuelve DNS (RFC 6761),
 *  el WebView lo intercepta antes de salir a la red. */
const RETURN_SENTINEL = 'medicget-subscription-return.invalid';

function buildCheckoutHtml(session: SubscriptionCheckoutResponse): string {
  const esc = (s: string | undefined) =>
    String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

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
    /* Shim para document.cookie — algunos WebViews rechazan setear
       cookies con origen "about:blank" o html inline. */
    (function () {
      try {
        document.cookie = '__mg_probe=1';
        if (document.cookie.indexOf('__mg_probe=1') !== -1) {
          document.cookie = '__mg_probe=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          return;
        }
      } catch (_) {}
      var jar = '';
      try {
        Object.defineProperty(document, 'cookie', {
          configurable: true,
          get: function () { return jar; },
          set: function (v) {
            var first = String(v).split(';')[0];
            if (/expires=.*1970|max-age=0/i.test(String(v))) {
              var key = first.split('=')[0];
              jar = jar.split('; ').filter(function (c) { return c.split('=')[0] !== key; }).join('; ');
              return;
            }
            var key2 = first.split('=')[0];
            var rest = jar.split('; ').filter(function (c) { return c && c.split('=')[0] !== key2; });
            rest.push(first);
            jar = rest.join('; ');
          },
        });
      } catch (_) {}
    })();

    /* Interceptor: PayPhone redirige a responseUrl al terminar. Atajamos
       en JS el redirect (window.location.* y document.location.href) y
       posteamos la URL al lado nativo. */
    (function () {
      function post(type, payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || null }));
        }
      }
      var SENTINEL = '${RETURN_SENTINEL}';
      function isReturnUrl(u) { return typeof u === 'string' && u.indexOf(SENTINEL) !== -1; }
      try {
        var origAssign  = window.location.assign.bind(window.location);
        var origReplace = window.location.replace.bind(window.location);
        window.location.assign  = function (u) { if (isReturnUrl(u)) { post('return', u); return; } origAssign(u); };
        window.location.replace = function (u) { if (isReturnUrl(u)) { post('return', u); return; } origReplace(u); };
        var descriptor = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
        if (descriptor && descriptor.set) {
          var origSet = descriptor.set;
          Object.defineProperty(window.location, 'href', {
            set: function (u) { if (isReturnUrl(u)) { post('return', u); return; } origSet.call(window.location, u); },
            get: function () { return descriptor.get.call(window.location); },
          });
        }
      } catch (_) {}
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
    <div id="loading" class="loading">Cargando pasarela...</div>
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
            amount:              ${session.amount ?? 0},
            amountWithoutTax:    ${session.amountWithoutTax ?? 0},
            amountWithTax:       ${session.amountWithTax ?? 0},
            tax:                 ${session.tax ?? 0},
            service:             ${session.service ?? 0},
            tip:                 ${session.tip ?? 0},
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
      var attempts = 0;
      var interval = setInterval(function () {
        attempts++;
        if (mountWidget()) { clearInterval(interval); }
        else if (attempts > 100) {
          clearInterval(interval);
          showError('No se pudo cargar el SDK de PayPhone. Revisa tu conexion.');
        }
      }, 100);
    })();
  </script>
</body>
</html>`;
}

export interface SubscribeCheckoutModalProps {
  visible:    boolean;
  plan:       PlanDto | null;
  onClose:    () => void;
  /** Se llama tras confirmar exitosamente (FREE/stub/PayPhone real). El
   *  padre suele usarlo para refetchear /subscriptions/me. */
  onSuccess?: () => void;
}

export function SubscribeCheckoutModal({
  visible, plan, onClose, onSuccess,
}: SubscribeCheckoutModalProps) {
  const [session, setSession] = useState<SubscriptionCheckoutResponse | null>(null);
  const [breakdown, setBreakdown] = useState<PaymentBreakdownDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stubConfirming, setStubConfirming] = useState(false);
  const [freeOk, setFreeOk] = useState(false);
  const [payphoneOpen, setPayphoneOpen] = useState(false);
  const intercepted = useRef(false);

  const responseUrl = useMemo(
    () => `https://${RETURN_SENTINEL}/return?planId=${plan?.id ?? ''}`,
    [plan?.id],
  );

  // Solicitar la sesion de checkout cuando se abre el modal.
  useEffect(() => {
    if (!visible || !plan) return;
    // Reset entre aperturas.
    setSession(null);
    setBreakdown(null);
    setError(null);
    setFreeOk(false);
    setPayphoneOpen(false);
    intercepted.current = false;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await subscriptionsApi.checkout({
          planId: plan.id,
          responseUrl,
        });
        if (cancelled) return;
        const data = res.data;

        // Plan FREE: backend ya activo la suscripcion.
        if (plan.monthlyPrice === 0) {
          setFreeOk(true);
          setLoading(false);
          return;
        }

        setSession(data);
        if (data.breakdown) setBreakdown(data.breakdown);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ??
          (err as Error).message ??
          'No se pudo iniciar la suscripcion.';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, plan, responseUrl]);

  const handleStubConfirm = async () => {
    if (!session?.subscriptionId) return;
    setStubConfirming(true);
    setError(null);
    try {
      await subscriptionsApi.confirm({
        subscriptionId: session.subscriptionId,
        fakeOk:         true,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'No se pudo confirmar (stub).';
      setError(msg);
      setStubConfirming(false);
    }
  };

  /** Confirma una subscripcion despues de que PayPhone redirigio al
   *  sentinel. Extrae los query params (id, clientTransactionId) y
   *  llama /subscriptions/confirm. */
  const confirmFromReturn = useCallback(
    async (url: string) => {
      if (!session?.subscriptionId) return;
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
      const payphoneId = params.get('id') || undefined;
      const ctx = params.get('clientTransactionId') || undefined;

      // Cerramos el WebView antes de hacer el POST — la UI vuelve al
      // modal padre que muestra "Confirmando..." al instante.
      setPayphoneOpen(false);
      setLoading(true);
      try {
        const r = await subscriptionsApi.confirm({
          subscriptionId:      session.subscriptionId,
          payphoneId,
          clientTransactionId: ctx,
        });
        if (r.data.status === 'ACTIVE') {
          onSuccess?.();
          onClose();
        } else if (r.data.status === 'PENDING') {
          setError('El pago quedo pendiente. Si te debitaron, revisa en unos minutos.');
        } else {
          setError('PayPhone rechazo el cobro.');
        }
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'No se pudo confirmar la suscripcion.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [session, onClose, onSuccess],
  );

  const tryInterceptReturn = useCallback(
    (url: string): boolean => {
      if (intercepted.current) return true;
      if (!url || !url.startsWith(`https://${RETURN_SENTINEL}`)) return false;
      intercepted.current = true;
      void confirmFromReturn(url);
      return true;
    },
    [confirmFromReturn],
  );

  const handleShouldStartLoad = (req: { url: string }): boolean => {
    if (tryInterceptReturn(req.url)) return false;
    return true;
  };

  const handleNavStateChange = (state: { url: string }) => {
    tryInterceptReturn(state.url);
  };

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

  if (!plan) return null;

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="formSheet">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <View className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Suscripcion
            </Text>
            <Text className="text-base font-bold text-slate-800 dark:text-white">
              {plan.name}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            className="w-9 h-9 rounded-lg items-center justify-center">
            <X size={18} color="#475569" />
          </Pressable>
        </View>

        <View className="flex-1 p-4">
          {error ? (
            <View className="mb-3">
              <Alert variant="error">{error}</Alert>
            </View>
          ) : null}

          {freeOk ? (
            <SectionCard>
              <View className="items-center py-6">
                <View className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center mb-3">
                  <CheckCircle size={28} color="#10b981" />
                </View>
                <Text className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                  Plan {plan.name} activado
                </Text>
                <Text className="text-sm text-slate-500 mb-5 text-center">
                  Tu plan gratuito ya esta listo para usar.
                </Text>
                <Button
                  onPress={() => { onSuccess?.(); onClose(); }}
                  fullWidth>
                  <Text className="text-white font-semibold">Listo</Text>
                </Button>
              </View>
            </SectionCard>
          ) : (
            <View className="gap-4">
              <SectionCard>
                <Text className="text-sm text-slate-500 dark:text-slate-400">
                  {plan.description ?? ''}
                </Text>
                <View className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      ${plan.monthlyPrice.toFixed(2)}
                    </Text>
                    <Text className="text-xs text-blue-700/70 dark:text-blue-300/70">
                      /mes
                    </Text>
                  </View>
                  <Text className="text-[11px] text-blue-700/70 dark:text-blue-300/70 mt-1">
                    Pago cada 30 dias. Sin permanencia.
                  </Text>

                  {breakdown && breakdown.platformFee > 0 ? (
                    <View className="mt-3 pt-3 border-t border-blue-200/60 gap-1">
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-blue-700/80 dark:text-blue-300/80">
                          Plan {plan.name}
                        </Text>
                        <Text className="text-xs text-blue-700/80 dark:text-blue-300/80">
                          ${breakdown.baseAmount.toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-blue-700/80 dark:text-blue-300/80">
                          Comision ({breakdown.feePct}%)
                        </Text>
                        <Text className="text-xs text-blue-700/80 dark:text-blue-300/80">
                          ${breakdown.platformFee.toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between pt-2 border-t border-blue-200/60">
                        <Text className="text-sm font-bold text-blue-800 dark:text-blue-200">
                          Total
                        </Text>
                        <Text className="text-sm font-bold text-blue-800 dark:text-blue-200">
                          ${breakdown.totalAmount.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </SectionCard>

              {loading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text className="text-sm text-slate-500 mt-3">
                    Confirmando con PayPhone...
                  </Text>
                </View>
              ) : session?.stubMode ? (
                <SectionCard>
                  <Alert variant="info">
                    <Text className="text-blue-700 dark:text-blue-300 text-sm">
                      <Text className="font-semibold">Modo desarrollo:</Text>{' '}
                      sin credenciales PayPhone. La suscripcion se activa al confirmar.
                    </Text>
                  </Alert>
                  <View className="mt-3">
                    <Button
                      onPress={handleStubConfirm}
                      loading={stubConfirming}
                      variant="success"
                      fullWidth>
                      <View className="flex-row items-center gap-2">
                        <CheckCircle size={16} color="#fff" />
                        <Text className="text-white font-semibold">
                          Activar plan (modo dev)
                        </Text>
                      </View>
                    </Button>
                  </View>
                </SectionCard>
              ) : session ? (
                <SectionCard>
                  <Text className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                    Toca el boton para abrir la pasarela PayPhone. Vas a poder
                    ingresar los datos de tu tarjeta sin perder esta pantalla.
                  </Text>
                  <Button onPress={() => setPayphoneOpen(true)} fullWidth>
                    <View className="flex-row items-center gap-2">
                      <CreditCard size={16} color="#fff" />
                      <Text className="text-white text-base font-semibold">
                        Pagar con PayPhone
                      </Text>
                    </View>
                  </Button>
                </SectionCard>
              ) : null}

              <View className="flex-row items-center justify-center gap-1.5">
                <ShieldCheck size={11} color="#94a3b8" />
                <Text className="text-[10px] text-slate-400">
                  Pago procesado por PayPhone con cifrado TLS
                </Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* WebView con la pasarela de PayPhone (cuando es plan pago real) */}
      {session && !session.stubMode ? (
        <RNModal
          visible={payphoneOpen}
          animationType="slide"
          onRequestClose={() => setPayphoneOpen(false)}
          presentationStyle="fullScreen">
          <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-slate-50 dark:bg-slate-950">
            <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <Text className="text-base font-semibold text-slate-800 dark:text-white">
                PayPhone
              </Text>
              <Pressable
                onPress={() => setPayphoneOpen(false)}
                hitSlop={8}
                className="w-9 h-9 rounded-lg items-center justify-center">
                <X size={18} color="#475569" />
              </Pressable>
            </View>
            <View className="flex-1 bg-white">
              <WebView
                originWhitelist={['*']}
                source={{
                  html: buildCheckoutHtml(session),
                  baseUrl: 'https://pay.payphonetodoesposible.com',
                }}
                onShouldStartLoadWithRequest={handleShouldStartLoad}
                onNavigationStateChange={handleNavStateChange}
                onMessage={handleMessage}
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
          </SafeAreaView>
        </RNModal>
      ) : null}
    </RNModal>
  );
}
