/**
 * Standardized error handling utilities for the application
 */

/**
 * Standardized error response type
 */
export type ErrorResponse = {
  success: false;
  error: string;
  message: string;
  details?: unknown;
};

/**
 * Standardized success response type
 */
export type SuccessResponse<T = unknown> = {
  success: true;
  data: T;
  message?: string;
};

/**
 * Combined response type
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Formats an error into a standardized error message
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    // Handle Supabase/Postgres errors
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }

    // Handle error with code
    if ('code' in error && typeof error.code === 'string') {
      return `Error code: ${error.code}`;
    }
  }

  return 'An unexpected error occurred';
}

/**
 * Logs an error with context
 */
export function logError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, unknown>
): void {
  console.error(`[${context}]`, {
    error: formatError(error),
    details: error,
    ...additionalInfo,
  });
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage = 'Operation failed'
): ErrorResponse {
  return {
    success: false,
    error: formatError(error),
    message: defaultMessage,
    details: error instanceof Error ? undefined : error,
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Wraps an async function with try-catch and standardized error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  errorMessage = 'Operation failed'
): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return createSuccessResponse(data);
  } catch (error) {
    logError(context, error);
    return createErrorResponse(error, errorMessage);
  }
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ErrorResponse {
  return !response.success;
}

/**
 * Type guard to check if response is a success
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success;
}
