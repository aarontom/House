import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Home, Plus, Wallet, Menu, X, LogIn, LogOut, User, Sun, Moon, LayoutGrid } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { useTheme } from '../hooks/useTheme';
import LoginModal from './LoginModal';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Explore', icon: Home },
    { path: '/create', label: 'Create', icon: Plus },
    { path: '/my-markets', label: 'My Markets', icon: LayoutGrid, requiresAuth: true },
    { path: '/portfolio', label: 'Portfolio', icon: Wallet, requiresAuth: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.requiresAuth || user);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient shadow-lg group-hover:brand-glow transition-all">
                <Home className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold brand-gradient-text">House</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-card text-text'
                        : 'text-muted hover:text-text hover:bg-card/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-muted hover:text-text hover:bg-card transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-text">{user.username}</div>
                    <div className="text-xs text-muted">
                      ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-card transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium brand-gradient hover:brand-glow text-white transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </button>
              )}

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 rounded-lg text-muted hover:text-text hover:bg-card"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 border-t border-border">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-card text-text'
                        : 'text-muted hover:text-text hover:bg-card/50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
              {user && (
                <div className="mt-4 pt-4 border-t border-border px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-card flex items-center justify-center">
                      <User className="h-5 w-5 text-muted" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text">{user.username}</div>
                      <div className="text-sm text-muted">
                        ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl brand-gradient">
                <Home className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold brand-gradient-text">House</span>
            </div>
            <p className="text-sm text-muted">
              Prediction markets for everyday events. Bet on what you believe.
            </p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
}
