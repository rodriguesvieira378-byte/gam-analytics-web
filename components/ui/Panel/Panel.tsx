"use client";

import type {
  HTMLAttributes,
  ReactNode
} from "react";

import { Card } from "../Card";
import styles from "./Panel.module.css";

export interface PanelProps
  extends HTMLAttributes<HTMLElement> {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}

export function Panel({
  title,
  eyebrow,
  description,
  action,
  footer,
  children,
  compact = false,
  className = "",
  ...props
}: PanelProps) {
  return (
    <Card
      className={[
        styles.panel,
        compact ? styles.compact : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <header className={styles.header}>
        <div>
          {eyebrow && (
            <span className={styles.eyebrow}>
              {eyebrow}
            </span>
          )}

          <h3>{title}</h3>

          {description && (
            <p>{description}</p>
          )}
        </div>

        {action && (
          <div className={styles.action}>
            {action}
          </div>
        )}
      </header>

      <div className={styles.body}>
        {children}
      </div>

      {footer && (
        <footer className={styles.footer}>
          {footer}
        </footer>
      )}
    </Card>
  );
}