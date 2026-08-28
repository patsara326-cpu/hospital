type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

/** Compatibility guard while a new view migration is rolling out. */
export function isMissingRelationError(error: SupabaseErrorLike | null | undefined) {
  if (!error) return false;

  return error.code === "42P01"
    || error.code === "PGRST205"
    || Boolean(error.message?.includes("Could not find the table"));
}
