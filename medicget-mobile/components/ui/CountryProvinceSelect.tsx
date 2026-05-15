/**
 * CountryProvinceSelect — dos pickers encadenados que escriben el nombre
 * (no el código) en el estado del caller. Cuando cambia el país se limpia
 * la provincia. Espejo simplificado del componente web.
 */

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { Modal } from '@/components/ui/Modal';
import { COUNTRIES, findCountry } from '@/lib/locations';

interface CountryProvinceSelectProps {
  country: string;
  province: string;
  onChange: (loc: { country: string | null; province: string | null }) => void;
}

export function CountryProvinceSelect({
  country,
  province,
  onChange,
}: CountryProvinceSelectProps) {
  const [openCountry, setOpenCountry] = useState(false);
  const [openProvince, setOpenProvince] = useState(false);

  const selectedCountry = findCountry(country);
  const provinces = selectedCountry?.provinces ?? [];

  return (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          País
        </Text>
        <Pressable
          onPress={() => setOpenCountry(true)}
          className="flex-row items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 h-12">
          <Text
            numberOfLines={1}
            className={`flex-1 text-base ${
              country
                ? 'text-slate-800 dark:text-slate-100'
                : 'text-slate-400'
            }`}>
            {selectedCountry
              ? `${selectedCountry.flag} ${selectedCountry.name}`
              : 'Seleccionar...'}
          </Text>
          <ChevronDown size={16} color="#94a3b8" />
        </Pressable>
      </View>

      <View className="flex-1">
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Provincia
        </Text>
        <Pressable
          onPress={() => provinces.length > 0 && setOpenProvince(true)}
          disabled={provinces.length === 0}
          className={`flex-row items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 h-12 ${
            provinces.length === 0 ? 'opacity-50' : ''
          }`}>
          <Text
            numberOfLines={1}
            className={`flex-1 text-base ${
              province
                ? 'text-slate-800 dark:text-slate-100'
                : 'text-slate-400'
            }`}>
            {province ||
              (provinces.length === 0
                ? 'Elegí país primero'
                : 'Seleccionar...')}
          </Text>
          <ChevronDown size={16} color="#94a3b8" />
        </Pressable>
      </View>

      <Modal
        visible={openCountry}
        onClose={() => setOpenCountry(false)}
        title="Seleccionar país">
        {COUNTRIES.map((c) => {
          const selected = c.name === country || c.code === country;
          return (
            <Pressable
              key={c.code}
              onPress={() => {
                onChange({ country: c.name, province: null });
                setOpenCountry(false);
              }}
              className="flex-row items-center py-3 active:bg-slate-50 dark:active:bg-slate-800">
              <Text className="text-xl mr-2">{c.flag}</Text>
              <Text
                className={`flex-1 text-base ${
                  selected
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-700 dark:text-slate-200'
                }`}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </Modal>

      <Modal
        visible={openProvince}
        onClose={() => setOpenProvince(false)}
        title="Seleccionar provincia">
        {provinces.map((p) => {
          const selected = p.name === province;
          return (
            <Pressable
              key={p.code}
              onPress={() => {
                onChange({ country: selectedCountry?.name ?? null, province: p.name });
                setOpenProvince(false);
              }}
              className="py-3 active:bg-slate-50 dark:active:bg-slate-800">
              <Text
                className={`text-base ${
                  selected
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-700 dark:text-slate-200'
                }`}>
                {p.name}
              </Text>
            </Pressable>
          );
        })}
      </Modal>
    </View>
  );
}
