"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient, isDemoMode } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(isDemoMode);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    isDemoMode ? "O sistema ainda está em modo demonstração." : ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;

    const supabase = getSupabaseClient();
    let active = true;

    async function prepareRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (
            exchangeError &&
            !exchangeError.message.toLowerCase().includes("code verifier")
          ) {
            throw exchangeError;
          }
        }

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (!active) return;
        if (sessionError) throw sessionError;

        if (data.session) {
          setReady(true);
          setError("");
          return;
        }

        window.setTimeout(async () => {
          const { data: delayedData } =
            await supabase.auth.getSession();

          if (!active) return;

          if (delayedData.session) {
            setReady(true);
            setError("");
          } else {
            setReady(true);
            setError(
              "O link é inválido ou expirou. Solicite um novo e-mail de recuperação."
            );
          }
        }, 1200);
      } catch (cause) {
        if (!active) return;

        setReady(true);
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível validar o link."
        );
      }
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setError("");
      }
    });

    prepareRecoverySession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("As duas senhas não são iguais.");
      return;
    }

    setSaving(true);

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } =
        await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      setMessage("Senha alterada com sucesso. Voltando para o login...");

      window.setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/");
      }, 1400);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível alterar a senha."
      );
      setSaving(false);
    }
  }

  return (
    <main className="login">
      <section className="login-card">
        <div className="login-hero">
          <div>
            <div className="brand-mark">G.A.M</div>
            <h1>
              Nova
              <br />
              <span>senha</span>
            </h1>
            <p>
              Crie uma nova senha para acessar o GAM Analytics Web.
            </p>
          </div>

          <div className="hero-tags">
            <span className="tag">OÁSIS RP</span>
            <span className="tag">Acesso privado</span>
            <span className="tag">Recuperação segura</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Redefinir senha</h2>
          <p>Digite a nova senha duas vezes para confirmar.</p>

          {!ready && (
            <div className="demo-note">
              Validando o link de recuperação...
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          {message && (
            <div
              className="demo-note"
              style={{
                color: "#8fe0b8",
                borderColor: "rgba(33, 163, 102, 0.35)",
                background: "rgba(33, 163, 102, 0.1)"
              }}
            >
              {message}
            </div>
          )}

          <label className="field">
            <span>Nova senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              disabled={!ready || Boolean(error) || saving}
              required
            />
          </label>

          <label className="field">
            <span>Confirmar nova senha</span>
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              disabled={!ready || Boolean(error) || saving}
              required
            />
          </label>

          <button
            className="btn"
            type="submit"
            disabled={!ready || Boolean(error) || saving}
          >
            {saving ? "Salvando..." : "Salvar nova senha"}
          </button>

          <button
            className="btn ghost"
            type="button"
            style={{ marginTop: 10 }}
            onClick={() => router.replace("/")}
          >
            Voltar ao login
          </button>
        </form>
      </section>
    </main>
  );
}
