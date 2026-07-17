"use client";

import styles from "./Loading.module.css";

export interface LoadingProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullHeight?: boolean;
}

export function Loading({
  label = "Carregando...",
  size = "md",
  fullHeight = false
}: LoadingProps) {
  return (
    <div
      className={[
        styles.loading,
        fullHeight ? styles.fullHeight : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          styles.spinner,
          styles[size]
        ].join(" ")}
      />

      <strong>{label}</strong>
    </div>
  );
}