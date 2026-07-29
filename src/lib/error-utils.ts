/**
 * Safely extract a string error message from any caught value.
 */
export function getErrorMessage(error: unknown, fallbackMessage = "An unexpected error occurred"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallbackMessage;
}

/**
 * Handle an error in a Server Action by logging and throwing a user-friendly Error.
 */
export function handleActionError(error: unknown, fallbackMessage = "Database operation failed"): never {
  const message = getErrorMessage(error, fallbackMessage);
  console.error("Action error:", error);
  throw new Error(message);
}

/**
 * Helper utility for standardized Supabase database error handling.
 */
export function handleDatabaseError(error: unknown, fallbackMessage = "Database operation failed"): never {
  return handleActionError(error, fallbackMessage);
}
