import { useState } from "react";

export const AddressAutocomplete = ({ form, setForm }: any) => {
  const [results, setResults] = useState<any[]>([]);

  const search = async (value: string) => {
    if (!value) return;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${value}`
    );
    const data = await res.json();
    setResults(data);
  };

  const select = (item: any) => {
    setForm({
      ...form,
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    });
    setResults([]);
  };

  return (
    <div className="relative">
      <input
        value={form.address}
        onChange={(e) => {
          setForm({ ...form, address: e.target.value });
          search(e.target.value);
        }}
        className="w-full dark:bg-slate-900 dark:text-white border rounded-lg p-3"
        placeholder="Buscar dirección..."
      />

      {results.length > 0 && (
        <div className="absolute w-full bg-white dark:bg-slate-900 dark:text-white border mt-1 rounded-lg shadow z-50">
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