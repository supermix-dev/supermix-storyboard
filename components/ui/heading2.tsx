'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Heading2({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="heading2"
      className={cn('scroll-m-20 text-2xl font-medium', className)}
      {...props}
    />
  );
}

export { Heading2 };
