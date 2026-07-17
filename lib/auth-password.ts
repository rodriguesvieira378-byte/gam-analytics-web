"use client";

import {
  getSupabaseClient,
  isDemoMode
} from "@/lib/supabase";

function cleanRecoveryUrl() {
  if (typeof window === "undefined") return;

  window.history.replaceState(
    {},
    document.title,
    `${window.location.pathname}${window.location.search}`
  );
}

export function isPasswordRecoveryUrl() {
  if (typeof window === "undefined") {
    return false;
  }

  const hash = new URLSearchParams(
    window.location.hash.slice(1)
  );

  const query = new URLSearchParams(
    window.location.search
  );

  return (
    hash.get("type") === "recovery" ||
    query.get("type") === "recovery" ||
    Boolean(hash.get("access_token"))
  );
}

export async function requestPasswordReset(
  email: string,
  redirectTo?: string
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Informe seu e-mail.");
  }

  if (isDemoMode) {
    throw new Error(
      "A recuperação por e-mail exige o Supabase conectado."
    );
  }

  const { error } =
    await getSupabaseClient().auth.resetPasswordForEmail(
      normalizedEmail,
      redirectTo
        ? {
            redirectTo
          }
        : undefined
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function completePasswordRecoverySession() {
  if (isDemoMode) {
    throw new Error(
      "A recuperação por e-mail exige o Supabase conectado."
    );
  }

  if (typeof window === "undefined") {
    return;
  }

  const hash = new URLSearchParams(
    window.location.hash.slice(1)
  );

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const errorDescription =
    hash.get("error_description");

  if (errorDescription) {
    cleanRecoveryUrl();
    throw new Error(
      decodeURIComponent(errorDescription)
    );
  }

  if (accessToken && refreshToken) {
    const { error } =
      await getSupabaseClient().auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

    if (error) {
      cleanRecoveryUrl();
      throw new Error(error.message);
    }
  }

  const { data, error } =
    await getSupabaseClient().auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error(
      "O link de recuperação é inválido ou expirou."
    );
  }
}

export async function updateCurrentUserPassword(
  password: string
) {
  if (password.length < 8) {
    throw new Error(
      "A nova senha precisa ter pelo menos 8 caracteres."
    );
  }

  if (isDemoMode) {
    throw new Error(
      "A alteração de senha exige o Supabase conectado."
    );
  }

  const { error } =
    await getSupabaseClient().auth.updateUser({
      password
    });

  if (error) {
    throw new Error(error.message);
  }

  cleanRecoveryUrl();
}
