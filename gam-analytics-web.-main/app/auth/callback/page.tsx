"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Validando seu acesso...");

  useEffect(() => {
    async function finishLogin() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey =
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("As variáveis do Supabase não estão configuradas.");
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });

        const hash = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );

        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          window.history.replaceState(
            {},
            document.title,
            "/auth/callback"
          );

          setMessage("Acesso confirmado. Abrindo o GAM Analytics...");
          window.setTimeout(() => window.location.replace("/"), 700);
          return;
        }

        const code = new URLSearchParams(window.location.search).get("code");

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) throw error;

          setMessage("Acesso confirmado. Abrindo o GAM Analytics...");
          window.setTimeout(() => window.location.replace("/"), 700);
          return;
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session) {
          window.location.replace("/");
          return;
        }

        throw new Error(
          "Link inválido ou expirado. Solicite um novo Magic Link."
        );
      } catch (error) {
        const text =
          error instanceof Error
            ? error.message
            : "Não foi possível concluir o acesso.";

        setMessage(text);
      }
    }

    finishLogin();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#071525",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "520px",
          border: "1px solid #173b5c",
          borderRadius: "18px",
          background: "#0b1d31",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#16a8ff",
            fontWeight: 800,
            letterSpacing: "0.12em",
            marginBottom: "12px",
          }}
        >
          G.A.M
        </div>

        <h1 style={{ margin: "0 0 14px", fontSize: "28px" }}>
          Confirmando acesso
        </h1>

        <p style={{ margin: 0, color: "#b7c9da", lineHeight: 1.6 }}>
          {message}
        </p>
      </section>
    </main>
  );
}
