import { Activity } from 'lucide-react';

export function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-700">
        <Activity className="w-6 h-6" />
        <h1 className="text-xl font-medium">medicget</h1>
      </div>
    </main>
  );
}
