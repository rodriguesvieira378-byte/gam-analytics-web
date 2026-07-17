"use client";

import type {
  ButtonHTMLAttributes,
  ReactNode
} from "react";

import styles from "./Button.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  icon,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        icon
      )}

      <span>
        {loading ? "Processando..." : children}
      </span>
    </button>
  );
}