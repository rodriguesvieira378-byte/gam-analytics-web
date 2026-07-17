"use client";

import styles from "./StatusDot.module.css";

export type StatusDotStatus =
  | "online"
  | "warning"
  | "offline"
  | "development"
  | "neutral";

export interface StatusDotProps {
  status?: StatusDotStatus;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function StatusDot({
  status = "online",
  pulse = true,
  size = "md",
  label
}: StatusDotProps) {
  return (
    <span className={styles.wrapper}>
      <i
        className={[
          styles.dot,
          styles[status],
          styles[size],
          pulse ? styles.pulse : ""
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />

      {label && (
        <span className={styles.label}>
          {label}
        </span>
      )}
    </span>
  );
}