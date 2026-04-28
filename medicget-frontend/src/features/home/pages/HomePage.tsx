import { Button } from '@/components/ui/Button';
import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-700">
        <Activity className="w-6 h-6" />
        <h1 className="text-xl font-medium">medicget</h1>
        <Button
          onClick={() => {
            navigate("/login");
          }}
          className="ml-6 px-6 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:text-slate-100"
        >
          Iniciar sesión
        </Button>
      </div>
    </main>
  );
}
