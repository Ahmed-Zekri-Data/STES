import React, { Suspense, useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { motion, AnimatePresence } from 'framer-motion';
import Breadcrumb from './Breadcrumb';
import ErrorBoundary from '../ErrorBoundary';
import PageLoader from '../PageLoader';
import QuickActions from './QuickActions';
import AdminSearch from './AdminSearch';
import NotificationsMenu from './NotificationsMenu';
import { canOpen } from './adminPermissions';
import { LogoMark } from '../brand/Logo';
import ThemeToggle from '../ThemeToggle';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Inbox,
  BadgePercent,
  Tag,
  Award,
  UserCog,
  Truck,
  MessageSquare,
  BarChart3
} from 'lucide-react';

// Tailwind's lg breakpoint: from here the sidebar is always shown
const DESKTOP_QUERY = '(min-width: 1024px)';

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isDesktop;
};

const AdminLayout = () => {
  const { admin, logout, hasPermission } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();

  const groups = [
    { label: 'Overview', items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
      { name: 'Tracking', href: '/admin/tracking', icon: Truck }
    ] },
    { label: 'Catalogue', items: [
      { name: 'Products', href: '/admin/products', icon: Package },
      { name: 'Categories', href: '/admin/categories', icon: Tag },
      { name: 'Brands', href: '/admin/brands', icon: Award },
      { name: 'Reviews', href: '/admin/reviews', icon: MessageSquare }
    ] },
    { label: 'Sales', items: [
      { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { name: 'Customers', href: '/admin/customers', icon: Users },
      { name: 'Promo codes', href: '/admin/promo-codes', icon: BadgePercent }
    ] },
    { label: 'Content', items: [
      { name: 'Forms', href: '/admin/forms', icon: Inbox },
      { name: 'Pages', href: '/admin/pages', icon: FileText }
    ] },
    { label: 'System', items: [
      // Only super admins manage admin accounts
      ...(admin?.role === 'super_admin' ? [{ name: 'Admin Users', href: '/admin/users', icon: UserCog }] : []),
      { name: 'Settings', href: '/admin/settings', icon: Settings }
    ] }
  ]
    .map(group => ({ ...group, items: group.items.filter(item => canOpen(hasPermission, item.href)) }))
    .filter(group => group.items.length > 0);
  const allowed = canOpen(hasPermission, location.pathname);

  const roleLabel = admin?.role === 'super_admin' ? 'Super admin' : 'Admin';
  const initials = (admin?.fullName || admin?.username || 'A').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path || (path === '/admin/dashboard' && location.pathname === '/admin');

  return (
    <div className="relative isolate min-h-screen">
      <div className="ambient" aria-hidden="true" />

      {/* Phones and tablets: the menu slides over the page */}
      <AnimatePresence>
        {sidebarOpen && !isDesktop && (
          <motion.div
            className="fixed inset-0 z-40 bg-gray-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* The console rail: deep water in both themes. Its position is set
          by the animation (an inline style), which a class like
          lg:translate-x-0 cannot override. */}
      <motion.aside
        className="dark fixed inset-y-0 left-0 z-50 w-72 p-3"
        initial={false}
        animate={{ x: isDesktop || sidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        aria-label="Admin menu"
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 shadow-large" style={{ backgroundColor: 'rgb(var(--deep))' }}>
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(80% 40% at 0% 0%, rgb(45 212 238 / 0.16), transparent 70%), radial-gradient(70% 40% at 100% 100%, rgb(139 92 246 / 0.14), transparent 70%)' }} aria-hidden="true" />

          <div className="relative flex h-16 items-center justify-between px-5">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" animated />
              <span className="font-display text-lg font-bold text-white">STES<span className="text-cyan-300">.tn</span></span>
              <span className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/60">Admin</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 lg:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 py-4">
            {groups.map(group => (
              <div key={group.label}>
                <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'text-white' : 'text-white/60 hover:text-white'}`}
                      >
                        {active && (
                          <motion.span
                            layoutId="admin-nav"
                            className="absolute inset-0 rounded-xl bg-white/[0.08] ring-1 ring-inset ring-cyan-300/30"
                            style={{ boxShadow: 'inset 3px 0 0 rgb(45 212 238), 0 0 24px -6px rgb(45 212 238 / 0.5)' }}
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          />
                        )}
                        <Icon className={`relative h-[18px] w-[18px] transition-colors ${active ? 'text-cyan-300' : 'text-white/45 group-hover:text-white/80'}`} aria-hidden="true" />
                        <span className="relative">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="relative border-t border-white/10 p-3">
            <div className="flex items-center gap-3 rounded-2xl p-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 font-display text-sm font-bold text-white">{initials}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{admin?.fullName}</p>
                <p className="truncate text-xs text-white/50">{roleLabel}</p>
              </div>
              <button onClick={handleLogout} aria-label="Logout" title="Logout" className="grid h-9 w-9 place-items-center rounded-full text-white/60 transition-colors hover:bg-red-500/15 hover:text-red-300">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
          <div className="glass flex h-16 items-center justify-between gap-3 rounded-full ps-2 pe-2 sm:ps-4">
            <div className="flex min-w-0 items-center gap-2">
              <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full hover:bg-gray-100 lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden md:block">
                <AdminSearch />
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <QuickActions />
              <NotificationsMenu />
              <ThemeToggle className="hidden sm:inline-flex" />
              <button
                onClick={() => navigate('/admin/settings')}
                title="My account"
                className="flex items-center gap-2 rounded-full p-1 pe-1 transition-colors hover:bg-gray-100 md:pe-3"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-display text-xs font-bold text-white">{initials}</span>
                <span className="hidden text-start md:block">
                  <span className="block text-sm font-medium leading-tight text-gray-800">{admin?.fullName}</span>
                  <span className="block text-xs leading-tight text-gray-500">{roleLabel}</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[96rem] px-4 pb-10 pt-6 sm:px-6">
          <Breadcrumb />
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            {/* Keeps the admin menu usable when a page fails */}
            <ErrorBoundary homePath="/admin/dashboard" homeLabel="Retour au tableau de bord">
              <Suspense fallback={<PageLoader />}>
                {allowed ? <Outlet /> : (
                  <div role="alert" className="panel p-8 text-center text-gray-700">
                    <p className="mb-1 font-semibold text-gray-900">You don&apos;t have access to this page.</p>
                    <p>A super admin can give you the permission in Admin Users.</p>
                  </div>
                )}
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
