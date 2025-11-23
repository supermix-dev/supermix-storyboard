import { cn } from '@/lib/utils';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const containerVariants = cva('mx-auto w-full px-2.5 lg:px-6', {
  variants: {
    size: {
      xs: 'max-w-[600px]',
      sm: 'max-w-(--breakpoint-sm)',
      md: 'max-w-(--breakpoint-md)',
      lg: 'max-w-(--breakpoint-lg)',
      xl: 'max-w-(--breakpoint-xl)',
      '2xl': 'max-w-(--breakpoint-2xl)',
      full: 'max-w-full',
    },
  },
  defaultVariants: {
    size: 'xl',
  },
});

export interface MaxWidthContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  asChild?: boolean;
}

const MaxWidthContainer = React.forwardRef<
  HTMLDivElement,
  MaxWidthContainerProps
>(({ className, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      className={cn(containerVariants({ size, className }))}
      ref={ref}
      {...props}
    />
  );
});
MaxWidthContainer.displayName = 'Div';

export { MaxWidthContainer };
