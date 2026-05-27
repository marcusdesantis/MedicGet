/**
 * PolicyPanel — panel informativo colapsable (espejo del web). Explica
 * políticas/procesos en contexto sin sacar al usuario de la pantalla.
 * Acepta `steps` (lista numerada) y/o `children` (contenido libre).
 */

import { ReactNode, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, type LucideIcon } from 'lucide-react-native';

type PolicyTone = 'blue' | 'amber' | 'emerald' | 'slate';

const TONE: Record<PolicyTone, { wrap: string; head: string; num: string; iconColor: string }> = {
  blue:    { wrap: 'bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800',          head: 'text-blue-800 dark:text-blue-200',       num: 'bg-blue-600',    iconColor: '#1d4ed8' },
  amber:   { wrap: 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800',      head: 'text-amber-800 dark:text-amber-200',     num: 'bg-amber-600',   iconColor: '#b45309' },
  emerald: { wrap: 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800', head: 'text-emerald-800 dark:text-emerald-200', num: 'bg-emerald-600', iconColor: '#047857' },
  slate:   { wrap: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',      head: 'text-slate-800 dark:text-slate-200',     num: 'bg-slate-600',   iconColor: '#475569' },
};

interface PolicyPanelProps {
  title: string;
  icon: LucideIcon;
  tone?: PolicyTone;
  defaultOpen?: boolean;
  /** Cada item es texto (string) de un paso del proceso. */
  steps?: string[];
  children?: ReactNode;
}

export function PolicyPanel({
  title, icon: Icon, tone = 'blue', defaultOpen = false, steps, children,
}: PolicyPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const t = TONE[tone];

  return (
    <View className={`rounded-2xl border ${t.wrap}`}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center gap-3 px-4 py-3">
        <Icon size={18} color={t.iconColor} />
        <Text className={`flex-1 text-sm font-semibold ${t.head}`}>{title}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={16} color={t.iconColor} />
        </View>
      </Pressable>

      {open ? (
        <View className="px-4 pb-4 gap-2.5">
          {steps?.map((step, i) => (
            <View key={i} className="flex-row items-start gap-3">
              <View className={`w-5 h-5 rounded-full ${t.num} items-center justify-center mt-0.5`}>
                <Text className="text-white text-[11px] font-bold">{i + 1}</Text>
              </View>
              <Text className="flex-1 text-sm text-slate-700 dark:text-slate-200 leading-5">{step}</Text>
            </View>
          ))}
          {children ? <View className="mt-1">{children}</View> : null}
        </View>
      ) : null}
    </View>
  );
}
