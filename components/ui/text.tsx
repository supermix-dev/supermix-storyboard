'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const textVariants = cva('leading-relaxed', {
  variants: {
    size: {
      default: 'text-base',
      sm: 'text-sm',
      xs: 'text-xs',
    },
    tone: {
      dark: 'text-foreground',
      light: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    size: 'default',
    tone: 'dark',
  },
});

function Text({
  className,
  size,
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<'p'> &
  VariantProps<typeof textVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'p';
  return (
    <Comp
      data-slot="text"
      className={cn(textVariants({ size, tone }), className)}
      {...props}
    />
  );
}

export { Text, textVariants };
