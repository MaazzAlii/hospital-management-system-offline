/**
 * Helper utility for standardized Supabase database error handling.
 */
export function handleDatabaseError(error: unknown, fallbackMessage = "Database operation failed"): never {
  console.error("Database Error:", error);
  if (error instanceof Error) {
    throw new Error(error.message);
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    throw new Error(String((error as { message: unknown }).message));
  }
  throw new Error(fallbackMessage);
}
