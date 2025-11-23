'use client';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function Controls() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer state update to avoid synchronous setState warning
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <ButtonGroup className="fixed bottom-3 right-3 z-50">
      <ThemeButton onClick={() => setTheme('light')} active={theme === 'light'}>
        <SunIcon className="fill-inherit size-4" />
      </ThemeButton>
      <ThemeButton onClick={() => setTheme('dark')} active={theme === 'dark'}>
        <MoonIcon className="fill-inherit size-4" />
      </ThemeButton>
    </ButtonGroup>
  );
}

function ThemeButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <Button
      variant="outline"
      className={cn(
        'text-muted-foreground fill-transparent',
        active && 'fill-foreground'
      )}
      size="sm"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
