'use client';
import { CustomToaster } from '@/components/ui/toaster';
import { toast as baseToast, type ExternalToast } from 'sonner';
import { formatError } from './error-handling';

type Actions = {
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
};

type CustomOpts = ExternalToast & {
  description?: string;
  actions?: Actions;
};

const renderNode = (
  status: 'success' | 'error' | 'warning' | 'info' | 'loading' | undefined,
  label: string,
  opts: CustomOpts
) => (
  <CustomToaster
    status={status}
    label={label}
    description={opts.description}
    actions={opts.actions}
  />
);

type PromiseMessages<Data = unknown> = {
  loading: string;
  success: string | ((data: Data) => string);
  error: string | ((error: unknown) => string);
};

function promise<Data = unknown>(
  promise: Promise<Data>,
  messages: PromiseMessages<Data>,
  opts: CustomOpts = {}
) {
  return baseToast.promise(promise, {
    loading: renderNode('loading', String(messages.loading), opts),
    success: (data: Data) =>
      renderNode(
        'success',
        typeof messages.success === 'function'
          ? messages.success(data)
          : String(messages.success),
        opts
      ),
    error: (err: unknown) =>
      renderNode(
        'error',
        typeof messages.error === 'function'
          ? messages.error(err)
          : String(messages.error),
        opts
      ),
  });
}

const render = (
  status: 'success' | 'error' | 'warning' | 'info' | 'loading' | undefined,
  label: string,
  opts: CustomOpts
) => {
  const ToastRenderer = () => (
    <CustomToaster
      status={status}
      label={label}
      description={opts.description}
      actions={opts.actions}
    />
  );
  ToastRenderer.displayName = 'ToastRenderer';
  return ToastRenderer;
};

export const toast = Object.assign(
  (label: string, opts: CustomOpts = {}) =>
    baseToast.custom(render(undefined, label, opts), opts),
  {
    custom: baseToast.custom,
    success: (label: string, opts: CustomOpts = {}) =>
      baseToast.custom(render('success', label, opts), opts),
    error: (label: string, opts: CustomOpts = {}) =>
      baseToast.custom(render('error', label, opts), opts),
    warning: (label: string, opts: CustomOpts = {}) =>
      baseToast.custom(render('warning', label, opts), opts),
    info: (label: string, opts: CustomOpts = {}) =>
      baseToast.custom(render('info', label, opts), opts),
    loading: (label: string, opts: CustomOpts = {}) =>
      baseToast.custom(render('loading', label, opts), opts),
    dismiss: baseToast.dismiss,
    promise,
    getHistory: baseToast.getHistory,
    getToasts: baseToast.getToasts,
  }
);

export type { CustomOpts as CustomToastOptions };

/**
 * Displays a standardized error toast
 */
export function toastError(
  error: unknown,
  defaultMessage = 'An error occurred'
): void {
  const errorMessage = formatError(error);
  toast.error(errorMessage || defaultMessage);
}

/**
 * Displays a standardized success toast
 */
export function toastSuccess(message: string, description?: string): void {
  toast.success(message, description ? { description } : undefined);
}

/**
 * Displays a warning toast
 */
export function toastWarning(message: string, description?: string): void {
  toast.warning(message, description ? { description } : undefined);
}

/**
 * Displays an info toast
 */
export function toastInfo(message: string, description?: string): void {
  toast.info(message, description ? { description } : undefined);
}

/**
 * Wraps an async operation with loading toast and handles success/error
 */
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error?: string | ((error: unknown) => string);
  }
): Promise<T> {
  toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: (err: unknown) => {
      if (messages.error) {
        return typeof messages.error === 'function'
          ? messages.error(err)
          : messages.error;
      }
      return formatError(err);
    },
  });
  return promise;
}
