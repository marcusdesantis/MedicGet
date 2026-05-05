import { useState } from "react";

interface AddressFields {
  address?: string;
  lat?:     number | null;
  lng?:     number | null;
}

interface Props<T extends AddressFields> {
  form:    T;
  setForm: (patch: Partial<T>) => void;
}

interface NominatimHit {
  display_name: string;
  lat:          string;
  lon:          string;
}

/**
 * Address autocomplete backed by OpenStreetMap's Nominatim. Works with any
 * registration draft that has `address`, `lat`, `lng` fields — i.e. both
 * the doctor and clinic flows.
 */
export const AddressAutocomplete = <T extends AddressFields>({ form, setForm }: Props<T>) => {
  const [results, setResults] = useState<NominatimHit[]>([]);

  const search = async (value: string) => {
    if (!value) {
      setResults([]);
      return;
    }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}`,
    );
    const data: NominatimHit[] = await res.json();
    setResults(data);
  };

  const select = (item: NominatimHit) => {
    setForm({
      address: item.display_name,
      lat:     parseFloat(item.lat),
      lng:     parseFloat(item.lon),
    } as Partial<T>);
    setResults([]);
  };

  return (
    <div className="relative">
      <input
        value={form.address ?? ""}
        onChange={(e) => {
          setForm({ address: e.target.value } as Partial<T>);
          search(e.target.value);
        }}
        className="w-full dark:bg-slate-900 dark:text-white border dark:border-slate-700 rounded-lg p-3"
        placeholder="Buscar dirección..."
      />

      {results.length > 0 && (
        <div className="absolute w-full bg-white dark:bg-slate-900 dark:text-white border dark:border-slate-700 mt-1 rounded-lg shadow z-50">
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => select(r)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {r.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
