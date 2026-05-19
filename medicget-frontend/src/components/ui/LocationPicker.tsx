/**
 * LocationPicker — selector de ubicación con país + provincia + mapa
 * con marker arrastrable. Plus un input de búsqueda libre de direcciones
 * filtrado por el país elegido (Ecuador por default) que mueve el marker.
 *
 *  ┌─────────────────────────────────────────────────────────┐
 *  │ País             ▾    Provincia          ▾   📍 Mi ubic. │
 *  ├─────────────────────────────────────────────────────────┤
 *  │ 🔎 Buscá una dirección, barrio o ciudad…                │
 *  ├─────────────────────────────────────────────────────────┤
 *  │              [ MAPA OPENSTREETMAP ]                     │
 *  │                       📍                                │
 *  ├─────────────────────────────────────────────────────────┤
 *  │ Dirección: Av. Amazonas 123                             │
 *  │ Ciudad:    Quito                                        │
 *  │ Lat: -0.18  ·  Lng: -78.46                              │
 *  └─────────────────────────────────────────────────────────┘
 *
 * Comportamiento:
 *   • Cambiar país → centra mapa en country.center, limpia provincia.
 *   • Cambiar provincia → centra mapa en province.lat/lng, zoom 11.
 *   • Buscar texto → llama a Nominatim filtrado por countrycode del país
 *     actual (Ecuador por default). Debounced 400ms. Top 5 resultados.
 *   • Seleccionar resultado del search → mueve marker + popula
 *     address/city/province automáticamente.
 *   • Click o drag del marker → guarda lat/lng + reverse geocoding.
 *   • Botón "📍 Usar mi ubicación" → geolocation + reverse geocoding.
 *
 * Sin dependencias externas más allá de Leaflet (que ya está instalado).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Locate, Loader2, MapPin, Search, X } from 'lucide-react';
import { COUNTRIES, findCountry, findProvince } from '@/lib/locations';
import { toast } from 'sonner';

// Fix por el clásico bug de Leaflet con Vite donde el ícono del marker
// no se carga porque busca rutas relativas. Usamos el CDN.
const ICON = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
});

export interface LocationValue {
  country?:  string;     // nombre legible (ej "Ecuador")
  province?: string;     // nombre legible (ej "Pichincha")
  city?:     string;
  address?:  string;
  latitude?: number;
  longitude?: number;
}

interface LocationPickerProps {
  value:    LocationValue;
  onChange: (next: LocationValue) => void;
  /** Si true, sólo permite arrastrar el marker (no agregarlo desde cero). */
  required?: boolean;
}

/** País default para el filtro del search cuando el usuario aún no eligió. */
const DEFAULT_COUNTRY_CODE = 'EC';

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const country  = findCountry(value.country);
  const province = findProvince(country, value.province);
  const [locating, setLocating] = useState(false);
  const [reversing, setReversing] = useState(false);

  // countrycode usado por el search de Nominatim. EC por default.
  const searchCountryCode = (country?.code ?? DEFAULT_COUNTRY_CODE).toLowerCase();

  // Centro y zoom del mapa derivados del país/provincia.
  const center: [number, number] = useMemo(() => {
    if (value.latitude && value.longitude) return [value.latitude, value.longitude];
    if (province) return [province.lat, province.lng];
    if (country)  return [country.center.lat, country.center.lng];
    return [-1.831239, -78.183406]; // Ecuador como default
  }, [value.latitude, value.longitude, country, province]);

  const zoom = value.latitude && value.longitude ? 14
             : province ? 11
             : country  ? country.zoom
             : 5;

  // ─── Geolocalización del browser ───────────────────────────
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const r = await reverseGeocode(lat, lng);
          onChange({
            ...value,
            country:   r.country  ?? value.country,
            province:  r.province ?? value.province,
            city:      r.city     ?? value.city,
            address:   r.address  ?? value.address,
            latitude:  lat,
            longitude: lng,
          });
          toast.success('Ubicación detectada');
        } catch {
          onChange({ ...value, latitude: lat, longitude: lng });
          toast.info('Ubicación detectada (sin dirección)');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? 'Bloqueaste el permiso de ubicación. Activalo desde la configuración del navegador.'
            : 'No se pudo obtener tu ubicación.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  // Click en el mapa o drag del marker → mover marker + reverse geocoding.
  const handleMapClick = async (lat: number, lng: number) => {
    onChange({ ...value, latitude: lat, longitude: lng });
    setReversing(true);
    try {
      const r = await reverseGeocode(lat, lng);
      onChange({
        ...value,
        latitude:  lat,
        longitude: lng,
        country:  r.country  ?? value.country,
        province: r.province ?? value.province,
        city:     r.city     ?? value.city,
        address:  r.address  ?? value.address,
      });
    } catch {
      /* swallow */
    } finally {
      setReversing(false);
    }
  };

  // Selección de un resultado del search → mover mapa + popular fields.
  const handleSearchSelect = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const a   = r.address ?? {};
    const province = a.state ?? a.region;
    const city     = a.city ?? a.town ?? a.village;
    const address  = [a.road, a.house_number].filter(Boolean).join(' ');
    onChange({
      ...value,
      latitude:  lat,
      longitude: lng,
      country:  a.country  ?? value.country,
      province: province   ?? value.province,
      city:     city       ?? value.city,
      address:  address || value.address,
    });
  };

  return (
    <div className="space-y-4">
      {/* SELECTORES de país/provincia (2 columnas — más espacio para que no
          se aplaste el label de "Provincia / Estado") */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Selector
          label="País"
          value={country?.code ?? ''}
          onChange={(code) => {
            const c = COUNTRIES.find((x) => x.code === code);
            onChange({
              ...value,
              country:   c?.name,
              province:  undefined,
              latitude:  undefined,
              longitude: undefined,
            });
          }}
          options={[
            { value: '', label: 'Elegí país…' },
            ...COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` })),
          ]}
        />
        <Selector
          label="Provincia / Estado"
          value={province?.code ?? ''}
          disabled={!country}
          onChange={(code) => {
            const p = country?.provinces.find((x) => x.code === code);
            onChange({
              ...value,
              province:  p?.name,
              // Mover el marker al centro de la provincia recién elegida —
              // siempre, no solo cuando no hay coords. Si el usuario
              // cambia de provincia es porque quiere ver esa zona.
              ...(p && { latitude: p.lat, longitude: p.lng }),
            });
          }}
          options={[
            { value: '', label: country ? 'Elegí provincia…' : 'Elegí país primero' },
            ...(country?.provinces.map((p) => ({ value: p.code, label: p.name })) ?? []),
          ]}
        />
      </div>

      {/* INPUT DE BÚSQUEDA + BOTÓN "Usar mi ubicación" en la misma fila.
          El search ocupa el espacio disponible, el botón es ancho fijo. */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
        <SearchAutocomplete
          countryCode={searchCountryCode}
          onSelect={handleSearchSelect}
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition disabled:opacity-50 whitespace-nowrap"
        >
          {locating ? <Loader2 size={14} className="animate-spin" /> : <Locate size={14} />}
          Usar mi ubicación
        </button>
      </div>


      {/* MAPA ──────────────────────────────────────────────── */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <MapContainer
          key={`${center[0]}-${center[1]}-${zoom}`}
          center={center}
          zoom={zoom}
          style={{ height: 320, width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          <RecenterOnChange center={center} zoom={zoom} />
          <ClickableMap onClick={handleMapClick} />
          {value.latitude !== undefined && value.longitude !== undefined && (
            <Marker
              position={[value.latitude, value.longitude]}
              icon={ICON}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const { lat, lng } = m.getLatLng();
                  void handleMapClick(lat, lng);
                },
              }}
            />
          )}
        </MapContainer>
        {reversing && (
          <div className="absolute top-2 right-2 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 shadow">
            <Loader2 size={12} className="animate-spin" /> Detectando dirección…
          </div>
        )}
        <p className="absolute bottom-2 left-2 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-lg px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 shadow">
          <MapPin size={11} /> Click o arrastrá el marker para precisar la ubicación
        </p>
      </div>

      {/* DIRECCIÓN + CIUDAD ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Dirección</label>
          <input
            value={value.address ?? ''}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            placeholder="Av. Amazonas 123 y Naciones Unidas"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Ciudad</label>
          <input
            value={value.city ?? ''}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="Quito"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {value.latitude !== undefined && value.longitude !== undefined && (
        <p className="text-[11px] text-slate-400 font-mono">
          📍 {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Helpers internos ───────────────────────── */

function Selector({
  label, value, onChange, options, disabled,
}: {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  options:  { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/** Re-centra el mapa cuando el `center` cambia desde afuera. */
function RecenterOnChange({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

/** Listener de click para colocar el marker. */
function ClickableMap({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* ─── Search autocomplete (Nominatim) ───────────────────────────────
 *
 * Input de búsqueda libre con dropdown de resultados. Filtra por país
 * via `countrycodes` — por default Ecuador.
 *
 * Debounced 400ms para no abusar del endpoint público de Nominatim
 * (rate limit 1 req/seg). Cancela requests anteriores con AbortController.
 *
 * Cierra el dropdown al hacer click afuera o al elegir un resultado.
 */
interface NominatimAddress {
  country?:      string;
  state?:        string;
  region?:       string;
  city?:         string;
  town?:         string;
  village?:      string;
  road?:         string;
  house_number?: string;
}

interface NominatimResult {
  place_id:     number;
  display_name: string;
  lat:          string;
  lon:          string;
  address?:     NominatimAddress;
  type?:        string;
}

function SearchAutocomplete({
  countryCode,
  onSelect,
}: {
  countryCode: string;
  onSelect:    (r: NominatimResult) => void;
}) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<NominatimResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const wrapRef                  = useRef<HTMLDivElement | null>(null);
  const abortRef                 = useRef<AbortController | null>(null);

  // Cerrar el dropdown al click afuera.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Debounced fetch a Nominatim.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('q', q);
        url.searchParams.set('countrycodes', countryCode);
        url.searchParams.set('limit', '5');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('accept-language', 'es');
        const res = await fetch(url.toString(), {
          headers: { 'Accept': 'application/json' },
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error('search failed');
        const data = (await res.json()) as NominatimResult[];
        setResults(data);
        setOpen(data.length > 0);
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query, countryCode]);

  const clear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
        Ubicación (búsqueda)
      </label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscá una dirección, barrio o ciudad…"
          className="w-full h-10 pl-9 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {loading ? (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-[1100] mt-1 w-full max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  clear();
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-start gap-2"
              >
                <MapPin size={14} className="mt-0.5 text-slate-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 leading-snug">
                  {r.display_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-slate-400 mt-1">
        Opcional · resultados filtrados por el país seleccionado arriba
      </p>
    </div>
  );
}

/* ─── Reverse geocoding via Nominatim ─── */
interface ReverseResult {
  country?:  string;
  province?: string;
  city?:     string;
  address?:  string;
}

async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error('Reverse failed');
  const data = await res.json() as {
    address?: {
      country?:  string;
      state?:    string;
      region?:   string;
      city?:     string;
      town?:     string;
      village?:  string;
      road?:     string;
      house_number?: string;
    };
  };
  const a = data.address ?? {};
  const province = a.state ?? a.region;
  const city     = a.city ?? a.town ?? a.village;
  const address  = [a.road, a.house_number].filter(Boolean).join(' ');
  return {
    country:  a.country,
    province,
    city,
    address: address || undefined,
  };
}
