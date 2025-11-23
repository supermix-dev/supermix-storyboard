'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Heading1({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      data-slot="heading1"
      className={cn('scroll-m-20 text-3xl font-medium', className)}
      {...props}
    />
  );
}

export { Heading1 };
