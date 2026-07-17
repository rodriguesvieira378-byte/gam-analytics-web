"use client";

import type { ReactNode } from "react";

import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false
}: EmptyStateProps) {
  return (
    <div
      className={[
        styles.empty,
        compact ? styles.compact : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && (
        <div className={styles.icon}>
          {icon}
        </div>
      )}

      <strong>{title}</strong>

      {description && (
        <p>{description}</p>
      )}

      {action && (
        <div className={styles.action}>
          {action}
        </div>
      )}
    </div>
  );
}