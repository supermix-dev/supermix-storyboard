'use client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useMemo, useState } from 'react';
export type ComoboOption = {
  value: string;
  label: string;
  icon: React.ReactNode | string | null | undefined;
  secondary_icon?: React.ReactNode | string | null | undefined;
};

function fuzzyMatch(query: string, text: string): boolean {
  query = query.toLowerCase();
  text = text.toLowerCase();

  let i = 0;
  for (const char of text) {
    if (char === query[i]) {
      i++;
      if (i === query.length) return true;
    }
  }
  return false;
}

export function Combobox({
  options,
  value,
  setValue,
  disabled,
  size = 'default',
  emptyMessage,
  placeholder,
  selector,
  searchable = true,
  className,
}: {
  options: ComoboOption[];
  value: string | undefined;
  setValue: (value: string) => void;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'default' | 'lg';
  emptyMessage?: string;
  placeholder?: string;
  selector?: React.ReactNode;
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleSelect = useCallback(
    (currentValue: string) => {
      if (disabled) return;
      const selectedOption = options.find((opt) => opt.value === currentValue);
      if (selectedOption) {
        setValue(selectedOption.value === value ? '' : selectedOption.value);
        setOpen(false);
      }
    },
    [options, value, setValue, disabled]
  );

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const isImage = useMemo(() => {
    if (typeof selectedOption?.icon === 'string') {
      return Boolean(selectedOption?.icon);
    }
    return false;
  }, [selectedOption]);
  const dropdownSize = size === 'xs' ? 'sm' : size;

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(newOpen) => !disabled && setOpen(newOpen)}
    >
      <PopoverTrigger disabled={disabled} asChild>
        {selector ? (
          selector
        ) : (
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            size={size}
            className={cn(
              'w-full justify-between gap-1 overflow-hidden shrink',
              disabled && 'cursor-not-allowed',
              size === 'xs' && 'px-1.5 pl-2',
              size === 'sm' && 'px-2 pl-2.5',
              size === 'default' && 'px-2 pl-2.5',
              size === 'lg' && 'px-2 pl-3',
              size === 'xs' && isImage && 'pl-1.5',
              size === 'sm' && isImage && 'pl-2',
              size === 'default' && isImage && 'pl-2',
              size === 'lg' && isImage && 'pl-2',
              className
            )}
          >
            <div className="flex items-center min-w-0 flex-1">
              {selectedOption ? (
                <div className="flex items-center gap-1 min-w-0">
                  {selectedOption?.icon && (
                    <Icon
                      icon={selectedOption?.icon}
                      label={selectedOption?.label ?? ''}
                      size={size}
                    />
                  )}
                  <span className={cn('truncate')}>
                    {selectedOption?.label}
                  </span>
                </div>
              ) : (
                <span className={cn('truncate')}>
                  {placeholder ?? 'Select...'}
                </span>
              )}
            </div>
            <ChevronsUpDown
              className={cn(
                'opacity-50 shrink-0 size-3.5',
                size === 'xs' && 'size-2.5',
                size === 'sm' && 'size-3',
                size === 'default' && 'size-3.5',
                size === 'lg' && 'size-4'
              )}
            />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0">
        <Command
          className="w-full rounded-lg"
          filter={(value: string, search: string) => {
            const option = options.find((option) => option.value === value);

            return fuzzyMatch(search, option?.label ?? '') ? 1 : 0;
          }}
        >
          {searchable && (
            <CommandInput
              placeholder="Search..."
              value={searchValue}
              onValueChange={setSearchValue}
              disabled={disabled}
              icon={false}
            />
          )}
          <CommandList className="w-full">
            <CommandEmpty>{emptyMessage ?? 'No results found.'}</CommandEmpty>
            <CommandGroup className="w-full">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    'w-full justify-between',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={disabled}
                >
                  <div className="flex items-center gap-1 truncate">
                    {option?.icon && (
                      <Icon
                        icon={option?.icon}
                        label={option?.label ?? ''}
                        size={dropdownSize}
                      />
                    )}
                    <span
                      className={cn(
                        'truncate font-normal',
                        dropdownSize === 'sm' && 'text-sm',
                        dropdownSize === 'default' && 'text-sm',
                        dropdownSize === 'lg' && 'text-base'
                      )}
                    >
                      {option?.label ?? 'Untitled'}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      'ml-auto shrink-0 stroke-foreground',
                      dropdownSize === 'sm' && 'size-3.5',
                      dropdownSize === 'default' && 'size-3.5',
                      dropdownSize === 'lg' && 'size-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Icon({
  icon,
  label,
  size = 'sm',
}: {
  icon: React.ReactNode | string | null | undefined;
  label: string;
  size?: 'xs' | 'sm' | 'default' | 'lg';
}) {
  const size_options = {
    xs: 'size-3.5',
    sm: 'size-4',
    default: 'size-5',
    lg: 'size-6',
  } as const;

  return (
    <div
      className={cn(
        'shrink-0 flex flex-col items-center justify-center',
        size_options[size]
      )}
    >
      {typeof icon === 'string' && Boolean(icon) && (
        <Image
          src={icon as string}
          alt={label ?? ''}
          className={cn('rounded-sm object-cover shrink-0', size_options[size])}
          width={50}
          height={50}
        />
      )}
      {typeof icon !== 'string' &&
        icon !== null &&
        React.isValidElement(icon) &&
        icon}
    </div>
  );
}
