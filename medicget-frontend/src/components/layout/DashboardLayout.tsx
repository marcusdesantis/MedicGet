import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, type NavItem } from './Sidebar';
import { TopNavbar } from './TopNavbar';

interface DashboardLayoutProps {
  navItems: NavItem[];
  roleLabel: string;
  roleColor: string;
}

function getTitleFromPath(path: string, navItems: NavItem[]): string {
  const match = navItems
    .slice()
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => path.startsWith(item.path));
  return match?.label ?? 'Dashboard';
}

export function DashboardLayout({ navItems, roleLabel, roleColor }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const pageTitle = getTitleFromPath(location.pathname, navItems);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar
        navItems={navItems}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setCollapsed((c) => !c)}
        onMobileClose={() => setMobileOpen(false)}
        roleLabel={roleLabel}
        roleColor={roleColor}
      />

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNavbar
          onMobileMenuOpen={() => setMobileOpen(true)}
          pageTitle={pageTitle}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
