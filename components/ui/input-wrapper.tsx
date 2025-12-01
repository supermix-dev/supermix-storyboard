import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

function InputWrapper({
  children,
  label,
  description,
  options,
  className,
  size = 'default',
}: {
  children: React.ReactNode;
  label?: string;
  description?: string;
  options?: {
    description_position?: 'top' | 'bottom';
  };
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  return (
    <div className={cn('flex flex-col gap-1 w-full', className)}>
      <div className="flex flex-col gap-1">
        {label && <Label size={size}>{label}</Label>}
        {description && options?.description_position !== 'bottom' && (
          <Label size={size} tint="light" weight={'light'}>
            {description}
          </Label>
        )}
      </div>
      {children}
      {description && options?.description_position === 'bottom' && (
        <Label size={size} tint="light">
          {description}
        </Label>
      )}
    </div>
  );
}

export { InputWrapper };
