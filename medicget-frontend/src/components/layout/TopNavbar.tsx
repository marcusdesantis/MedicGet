import { Menu, Bell, Search, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface TopNavbarProps {
  onMobileMenuOpen: () => void;
  pageTitle: string;
}

export function TopNavbar({ onMobileMenuOpen, pageTitle }: TopNavbarProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between
                       bg-white/80 dark:bg-slate-900/80 backdrop-blur-md
                       border-b border-slate-200 dark:border-slate-700
                       px-4 lg:px-6 h-16 gap-4">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-slate-800 dark:text-white truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right: search + theme + notifications + avatar */}
      <div className="flex items-center gap-2">

        {/* Search (desktop) */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800
                        rounded-xl px-3 py-2 text-sm text-slate-400 w-48 cursor-pointer
                        hover:bg-slate-200 dark:hover:bg-slate-700 transition">
          <Search size={15} />
          <span>Buscar...</span>
        </div>

        <ThemeToggle />

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400
                           hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
        </button>

        {/* User avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl
                       hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                            flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
              {user?.name}
            </span>
            <ChevronDown size={14} className="text-slate-400 hidden md:block" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 z-20
                              bg-white dark:bg-slate-800
                              border border-slate-200 dark:border-slate-700
                              rounded-2xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">@{user?.username}</p>
                </div>
                <button
                  onClick={() => { logout(); setDropdownOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-rose-600
                             hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
