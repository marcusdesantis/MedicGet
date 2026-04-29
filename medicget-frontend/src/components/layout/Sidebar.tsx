import { NavLink } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Stethoscope } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface SidebarProps {
  navItems: NavItem[];
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onMobileClose: () => void;
  roleLabel: string;
  roleColor: string; // tailwind bg class e.g. "bg-blue-600"
}

export function Sidebar({
  navItems,
  collapsed,
  mobileOpen,
  onCollapse,
  onMobileClose,
  roleLabel,
  roleColor,
}: SidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-slate-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${roleColor} flex items-center justify-center shadow-sm`}>
          <Stethoscope size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-slate-800 dark:text-white text-base leading-none">MedicGet</span>
            <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.split('/').length <= 2}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                  ? `${roleColor} text-white shadow-sm`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:flex px-3 pb-4">
        <button
          onClick={onCollapse}
          className="flex items-center justify-center w-full py-2 rounded-xl text-slate-400
                     hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white
                     transition border border-slate-200 dark:border-slate-700 text-xs gap-1.5"
        >
          {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span>Colapsar</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0
                    bg-white dark:bg-slate-900
                    border-r border-slate-200 dark:border-slate-700
                    transition-all duration-300 ease-in-out
                    ${collapsed ? 'w-[68px]' : 'w-60'}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 lg:hidden
                    bg-white dark:bg-slate-900
                    border-r border-slate-200 dark:border-slate-700
                    transform transition-transform duration-300 ease-in-out
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl ${roleColor} flex items-center justify-center`}>
              <Stethoscope size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-800 dark:text-white">MedicGet</span>
          </div>
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="px-2 py-4 space-y-1 overflow-y-auto h-[calc(100%-64px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path.split('/').length <= 2}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive
                    ? `${roleColor} text-white shadow-sm`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
