'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';

import { cn } from '@/lib/utils';

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
  size?: 'sm' | 'default' | 'lg';
  tint?: 'light' | 'default';
  weight?: 'light' | 'medium';
};

function Label({
  className,
  size = 'default',
  tint = 'default',
  weight = 'medium',
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        size === 'sm' && 'text-xs',
        size === 'default' && 'text-sm',
        size === 'lg' && 'text-base',
        tint === 'light' && 'text-muted-foreground',
        weight === 'light' && 'font-normal',
        weight === 'medium' && 'font-medium',
        className
      )}
      {...props}
    />
  );
}

export { Label };
