/**
 * LocationPicker — selector de ubicación con país + provincia + mapa
 * con marker arrastrable.
 *
 *  ┌─────────────────────────────────────────────────────────┐
 *  │ País             ▾    Provincia          ▾   📍 Mi ubicación │
 *  ├─────────────────────────────────────────────────────────┤
 *  │                                                         │
 *  │              [ MAPA OPENSTREETMAP ]                     │
 *  │                       📍                                │
 *  │                                                         │
 *  ├─────────────────────────────────────────────────────────┤
 *  │ Dirección: Av. Amazonas 123                             │
 *  │ Ciudad:    Quito                                        │
 *  │ Lat: -0.18  ·  Lng: -78.46                              │
 *  └─────────────────────────────────────────────────────────┘
 *
 * Comportamiento:
 *   • Cambiar país → centra mapa en country.center, limpia provincia.
 *   • Cambiar provincia → centra mapa en province.lat/lng, zoom 11.
 *   • Click o drag del marker → guarda lat/lng + intenta reverse
 *     geocoding con Nominatim para autocompletar address y city.
 *   • Botón "📍 Usar mi ubicación" → navigator.geolocation +
 *     reverse geocoding para preseleccionar país + provincia + marker.
 *
 * Sin dependencias externas más allá de Leaflet (que ya está
 * instalado).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Locate, Loader2, MapPin } from 'lucide-react';
import { COUNTRIES, findCountry, findProvince, type Country } from '@/lib/locations';
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

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const country  = findCountry(value.country);
  const province = findProvince(country, value.province);
  const [locating, setLocating] = useState(false);
  const [reversing, setReversing] = useState(false);

  // Centro y zoom del mapa derivados del país/provincia
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
          // Sin reverse → al menos guardamos coords
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

  // Click en el mapa → mover marker + reverse geocoding
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
      /* swallow — el usuario al menos ya tiene el marker */
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Selectores de país/provincia + botón Mi ubicación */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              // Auto-centro: el marker se mueve al centro de la provincia
              // cuando todavía no hay coords explícitas.
              ...(!value.latitude && p && { latitude: p.lat, longitude: p.lng }),
            });
          }}
          options={[
            { value: '', label: country ? 'Elegí provincia…' : 'Elegí país primero' },
            ...(country?.provinces.map((p) => ({ value: p.code, label: p.name })) ?? []),
          ]}
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition disabled:opacity-50 self-end"
        >
          {locating ? <Loader2 size={14} className="animate-spin" /> : <Locate size={14} />}
          Usar mi ubicación
        </button>
      </div>

      {/* Mapa */}
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

      {/* Inputs de dirección + ciudad — readable, editables manualmente */}
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

/* ─── Helpers internos ─── */

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

/** Re-centra el mapa cuando el `center` cambia desde afuera (ej: al elegir
 *  una provincia distinta). Sin esto, Leaflet ignora el cambio porque
 *  `center` es propiedad inicial. */
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

/* ─── Reverse geocoding via Nominatim (OSM) ───
 *
 * Endpoint público gratuito sin API key. Tiene rate limit (1 req/seg)
 * pero para uso normal de UI no llegamos cerca. Si en el futuro queremos
 * más volumen, conviene auto-hospedar un Nominatim o pasar a una alt
 * tipo Mapbox geocoding.
 *
 * Devuelve sólo los campos que nos interesan.
 */
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
