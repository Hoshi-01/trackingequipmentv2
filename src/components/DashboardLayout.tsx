'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

type ThemeMode = 'light' | 'dark';

interface NavItem {
  href: string;
  icon: 'dashboard' | 'equipment' | 'history' | 'reports' | 'calibration' | 'qrcode';
  label: string;
  description: string;
}

type IconName = NavItem['icon'] | 'admin' | 'brand';

const NAV_ITEMS: NavItem[] = [
  { href: '/', icon: 'dashboard', label: 'Dashboard', description: 'Ringkasan operasional' },
  { href: '/equipment', icon: 'equipment', label: 'Daftar Alat', description: 'Aset dan status' },
  { href: '/history', icon: 'history', label: 'History Log', description: 'Timeline aktivitas' },
  { href: '/reports', icon: 'reports', label: 'Laporan', description: 'Analitik dan ekspor' },
  { href: '/calibration', icon: 'calibration', label: 'Rekalibrasi', description: 'Jadwal tahunan alat' },
  { href: '/qrcode', icon: 'qrcode', label: 'QR Code', description: 'Generator formulir' },
];

function IconGlyph({ icon }: { icon: IconName }) {
  if (icon === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
      </svg>
    );
  }
  if (icon === 'equipment') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6v4h3l2 2v4h-2v8H6v-8H4V9l2-2h3zM8 9v2h8V9zM8 13v6h8v-6z" />
      </svg>
    );
  }
  if (icon === 'history') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5a7 7 0 1 1-6.7 9H3l3.5-3.5L10 14H7.3A5 5 0 1 0 12 7zM11 8h2v5l4 2-1 1.7-5-2.7z" />
      </svg>
    );
  }
  if (icon === 'reports') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3h10l4 4v14H5zm9 1v4h4M8 12h8v2H8zm0 4h8v2H8zm0-8h4v2H8z" />
      </svg>
    );
  }
  if (icon === 'calibration') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 2h2v2h6V2h2v2h3v18H4V4zm11 8V6H6v4zm-2 4H8v2h8zm0 4H8v2h8z" />
      </svg>
    );
  }
  if (icon === 'qrcode') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3h8v8H3zm2 2v4h4V5zM13 3h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zM13 13h2v2h-2zm4 0h4v2h-2v2h-2zm-2 4h4v4h-2v-2h-2zm-2 2h2v2h-2z" />
      </svg>
    );
  }
  if (icon === 'admin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l3 2.5 3.8-.8 1.6 3.6L23 10l-2.6 2.7.6 3.8-3.5 1.7L15 22l-3-2-3 2-2.5-3.8-3.5-1.7.6-3.8L1 10l2.6-2.7L5.2 3.7 9 4.5zM12 8a4 4 0 1 0 .01 8.01A4 4 0 0 0 12 8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.5 6L22 9l-5 5 1.2 7L12 18l-6.2 3L7 14 2 9l6.5-1z" />
    </svg>
  );
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  return saved === 'dark' ? 'dark' : 'light';
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const refreshAdminAccess = () => {
      setIsAdminLoggedIn(localStorage.getItem('adminLoggedIn') === 'true');
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'adminLoggedIn') {
        refreshAdminAccess();
      }
    };
    const onAdminAuthChanged = () => refreshAdminAccess();

    refreshAdminAccess();
    window.addEventListener('focus', refreshAdminAccess);
    window.addEventListener('storage', onStorage);
    window.addEventListener('admin-auth-changed', onAdminAuthChanged);

    return () => {
      window.removeEventListener('focus', refreshAdminAccess);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin-auth-changed', onAdminAuthChanged);
    };
  }, [pathname]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const navItems = isAdminLoggedIn
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.href !== '/history');

  return (
    <div className="app-shell">
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Buka menu navigasi"
      >
        <span />
        <span />
        <span />
      </button>

      <button
        type="button"
        className={`mobile-menu-backdrop${mobileMenuOpen ? ' is-open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-label="Tutup menu navigasi"
      />

      <aside className={`app-sidebar${mobileMenuOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark nav-mark" data-icon="brand">
            <IconGlyph icon="brand" />
          </div>
          <div className="brand-copy">
            <div className="brand-title">Equipment Tracking</div>
            <div className="brand-subtitle">PT Tera Emcal Solusindo</div>
          </div>
          <button
            type="button"
            className="mobile-menu-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu"
          >
            x
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link${active ? ' is-active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="nav-mark" data-icon={item.icon}>
                  <IconGlyph icon={item.icon} />
                </span>
                <span className="nav-copy">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link
            href="/admin"
            className={`sidebar-link${pathname === '/admin' ? ' is-active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="nav-mark" data-icon="admin">
              <IconGlyph icon="admin" />
            </span>
            <span className="nav-copy">
              <strong>Admin Panel</strong>
              <small>Kontrol data master</small>
            </span>
          </Link>
          <button type="button" className="theme-btn" onClick={toggleTheme}>
            Toggle Theme
          </button>
        </div>
      </aside>

      <main className="app-main">
        <div className="page-shell">{children}</div>
      </main>
    </div>
  );
}
