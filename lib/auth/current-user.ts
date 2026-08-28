import "server-only";

import { cache } from "react";

import { observeServerOperation, queryMetrics } from "@/lib/observability/server-performance";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getRequestSupabaseClient = cache(createSupabaseServerClient);

export const getCurrentUser = cache(async () => {
  const supabase = await getRequestSupabaseClient();
  if (!supabase) return { supabase: null, user: null, error: null };

  const result = await observeServerOperation(
    "auth.get_current_user",
    () => supabase.auth.getUser(),
  );
  return { supabase, user: result.data.user, error: result.error };
});

export const getCurrentProfile = cache(async () => {
  const current = await getCurrentUser();
  if (!current.supabase || !current.user) {
    return { ...current, profile: null };
  }
  const user = current.user;

  const result = await observeServerOperation(
    "auth.get_current_profile",
    () => current.supabase
      .from("users")
      .select("prefix, first_name, last_name, username, role")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    (value) => queryMetrics({ data: value.data ? [value.data] : [] }),
  );
  return { ...current, profile: result.data, profileError: result.error };
});
