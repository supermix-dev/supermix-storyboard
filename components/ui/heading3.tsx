'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Heading3({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="heading3"
      className={cn('scroll-m-20 text-xl font-medium', className)}
      {...props}
    />
  );
}

export { Heading3 };
