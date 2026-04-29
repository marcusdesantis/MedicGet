import { FileText, Download, Eye, AlertCircle } from 'lucide-react';
import { PageHeader }    from '@/components/ui/PageHeader';
import { SectionCard }   from '@/components/ui/SectionCard';
import { StatusBadge }   from '@/components/ui/StatusBadge';
import { IconButton }    from '@/components/ui/IconButton';
import { recordTypeMap } from '@/lib/statusConfig';
import { medicalRecords } from '@/lib/mockData';

const ALLERGIES   = ['Penicilina', 'Ibuprofeno'];
const CONDITIONS  = ['Hipertensión leve', 'Alergia estacional'];
const MEDICATIONS = ['Enalapril 10mg/día', 'Loratadina 10mg (temporal)'];

interface AlertPanelProps {
  title:    string;
  icon:     typeof AlertCircle;
  bg:       string;
  border:   string;
  titleCls: string;
  items:    string[];
  itemCls:  string;
}

function AlertPanel({ title, icon: Icon, bg, border, titleCls, items, itemCls }: AlertPanelProps) {
  return (
    <div className={`${bg} border ${border} rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={titleCls} />
        <span className={`text-sm font-semibold ${titleCls}`}>{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`text-xs px-2 py-1 rounded-lg font-medium ${itemCls}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export function MedicalHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Historial médico" subtitle="Tus registros y documentos médicos" />

      {/* Summary panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AlertPanel
          title="Alergias" icon={AlertCircle}
          bg="bg-rose-50 dark:bg-rose-900/20"    border="border-rose-200 dark:border-rose-800"
          titleCls="text-rose-600 dark:text-rose-400"
          items={ALLERGIES}
          itemCls="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
        />
        <AlertPanel
          title="Condiciones" icon={AlertCircle}
          bg="bg-amber-50 dark:bg-amber-900/20"  border="border-amber-200 dark:border-amber-800"
          titleCls="text-amber-600 dark:text-amber-400"
          items={CONDITIONS}
          itemCls="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
        />
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Medicamentos activos</span>
          </div>
          <div className="flex flex-col gap-1">
            {MEDICATIONS.map((m) => <span key={m} className="text-xs text-blue-700 dark:text-blue-300">{m}</span>)}
          </div>
        </div>
      </div>

      {/* Records list */}
      <SectionCard title="Documentos médicos" noPadding>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {medicalRecords.map((rec) => (
            <div key={rec.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{rec.title}</p>
                  {rec.urgent && (
                    <span className="text-xs bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full font-medium">
                      Urgente
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{rec.doctor} · {rec.date}</p>
              </div>
              <div className="hidden sm:block flex-shrink-0">
                <StatusBadge status={rec.type} statusMap={recordTypeMap} size="sm" />
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <IconButton icon={Eye}      title="Ver"       variant="primary" />
                <IconButton icon={Download} title="Descargar" variant="primary" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
