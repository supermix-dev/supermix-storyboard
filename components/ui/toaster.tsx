'use client';

import {
  CheckIcon,
  InfoIcon,
  LoaderIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { Button } from './button';
import { Text } from './text';

function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="bottom-center"
      icons={{
        success: null,
        info: null,
        warning: null,
        error: null,
        loading: null,
      }}
      closeButton={false}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'bg-transparent p-0 shadow-none border-0',
          content: 'p-0',
          icon: 'hidden',
          closeButton: 'hidden',
        },
      }}
      {...props}
    />
  );
}

type ActionProps = {
  label: string;
  onClick: () => void;
};

function CustomToaster({
  status,
  label,
  actions,
  description,
}: ToasterProps & {
  status?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  label: string;
  actions?: {
    primary?: ActionProps;
    secondary?: ActionProps;
  };
  description?: string;
}) {
  const desc = useMemo(() => {
    if (
      description === '' ||
      description === undefined ||
      description === null
    ) {
      return null;
    }
    return description;
  }, [description]);

  return (
    <div className="p-4 w-[356px] flex flex-row gap-1 bg-card border rounded-xl">
      {status === 'loading' && <LoaderIcon className="size-4 animate-spin" />}
      {status === 'success' && <CheckIcon className="size-4" />}
      {status === 'error' && <TriangleAlertIcon className="size-4" />}
      {status === 'warning' && <TriangleAlertIcon className="size-4" />}
      {status === 'info' && <InfoIcon className="size-4" />}
      <div className="flex flex-col w-full gap-1">
        <div className="flex flex-row items-center justify-between w-full gap-2">
          <Text className="line-clamp-1 leading-none">{label}</Text>
          <div className="flex flex-row items-center gap-1">
            <ToastActions actions={actions} hidden={!!desc} />
          </div>
        </div>
        {desc && (
          <Text size="sm" tone="light" className="">
            {description}
          </Text>
        )}
        <ToastActions actions={actions} hidden={!desc} />
      </div>
    </div>
  );
}

export { CustomToaster, Toaster };

function ToastActions({
  actions,
  hidden = false,
}: {
  actions: { primary?: ActionProps; secondary?: ActionProps } | undefined;
  hidden?: boolean;
}) {
  if (hidden || !actions) {
    return null;
  }
  return (
    <div className="w-full flex justify-end">
      <div className="flex flex-row items-center gap-1 mt-1">
        {actions?.secondary && (
          <Button
            onClick={actions.secondary.onClick}
            variant="outline"
            size="sm"
          >
            {actions.secondary.label}
          </Button>
        )}
        {actions?.primary && (
          <Button onClick={actions.primary.onClick} variant="default" size="sm">
            {actions.primary.label}
          </Button>
        )}
      </div>
    </div>
  );
}
