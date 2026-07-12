/**
 * Topbar — top navigation bar with theme toggle, notifications, and user menu.
 */

import { Sun, Moon, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { logout } from '@/api/auth';
import { getStoredUser } from '@/api/client';
import { ROLE_LABELS } from '@/lib/roles';

export function Topbar({ title }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    // Keep user state in sync with localStorage changes
    const handleAuthChange = () => {
      setUser(getStoredUser());
    };
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleLogout = async () => {
    try { await logout(); } catch { /* clear local state even if API fails */ }
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />

      <h1 className="text-base font-semibold tracking-tight flex-1">{title}</h1>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>

      {/* Notifications bell */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full relative"
        onClick={() => navigate('/notifications')}
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full p-0 h-8 w-8 hover:opacity-85 transition-opacity cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABELS[user?.role] || 'Employee'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
