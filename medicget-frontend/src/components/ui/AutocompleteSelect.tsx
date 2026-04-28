import { useState } from "react";
import { Search } from "lucide-react";

type Option = {
  label: string;
  value: string;
};

type Props = {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
};

export const AutocompleteSelect = ({
  options,
  value,
  onChange,
}: Props) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const select = (opt: Option) => {
    onChange(opt.label);
    setQuery(opt.label);
    setOpen(false);
  };

  return (
    <div className="relative">

      {/* INPUT */}
      <div
        className="flex items-center border border-slate-300 rounded-lg px-3 bg-white dark:bg-slate-900"
        onClick={() => setOpen(true)}
      >
        <Search size={16} className="text-slate-400 mr-2" />

        <input
          value={query || value || ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="w-full py-2 bg-transparent outline-none text-sm"
          placeholder="Buscar especialidad..."
        />
      </div>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 rounded-lg shadow max-h-48 overflow-auto">

          {filtered.length === 0 && (
            <div className="p-2 text-sm text-slate-400">
              No hay resultados
            </div>
          )}

          {filtered.map((opt) => (
            <div
              key={opt.value}
              onClick={() => select(opt)}
              className="p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};