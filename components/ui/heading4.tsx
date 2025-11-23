'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Heading4({ className, ...props }: React.ComponentProps<'h4'>) {
  return (
    <h4
      data-slot="heading4"
      className={cn('scroll-m-20 text-lg font-medium', className)}
      {...props}
    />
  );
}

export { Heading4 };
