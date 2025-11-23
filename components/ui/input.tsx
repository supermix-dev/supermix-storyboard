import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const inputVariants = cva(
  'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 border bg-transparent shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      size: {
        sm: 'h-8 text-sm rounded-md px-2.5',
        default: 'h-9 text-sm rounded-lg px-2.5',
        lg: 'h-10 text-sm rounded-xl px-3',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

function Input({
  className,
  type,
  size,
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> &
  VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
