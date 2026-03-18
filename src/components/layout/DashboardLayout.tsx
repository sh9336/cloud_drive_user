import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Cloud,
  Files,
  Key,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/dashboard', icon: Files, label: 'Files' },
  { href: '/sync-tokens', icon: Key, label: 'Sync Tokens' },
  { href: '/profile', icon: Settings, label: 'Profile' },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Modern and consistent */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 transform border-r border-border/50 bg-card transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col justify-between">
          {/* Logo */}
          <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Cloud className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-foreground">Cloud Drive</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border/50 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium text-foreground text-xs leading-none mb-0.5">
                      {user?.full_name || 'Tenant User'}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground leading-none">
                      {user?.email}
                    </p>
                  </div>
                  <Settings className="h-3.5 w-3.5 text-muted-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="text-xs">
                  <span className="text-muted-foreground">
                    {user?.company_name || 'No company'}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center text-xs">
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive text-xs focus:text-destructive">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header - Minimal, with optional actions */}
        <header className="flex h-14 items-center gap-4 border-b border-border/50 bg-background/50 px-4 backdrop-blur-sm shadow-sm shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex items-center gap-2">
            {/* Optional: Add global search or breadcrumbs here later */}
          </div>

          <ThemeToggle />
        </header>

        {/* Page content - centered container */}
        <main className="flex-1 overflow-y-auto bg-background/50 relative">
          <div className="mx-auto flex flex-col min-h-full max-w-6xl">
            <div className="flex-1 p-6">
              {children}
            </div>

            <footer className="py-6 px-6 border-t border-border/30 bg-background/50 backdrop-blur-sm">
              <div className="flex flex-col gap-2 text-[10px] text-muted-foreground uppercase tracking-wider opacity-70 sm:flex-row sm:justify-between sm:items-center">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500/50" />
                  System Operational
                </span>
                <span className="text-right">Cloud Drive v1.0 • &copy; {new Date().getFullYear()}</span>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
