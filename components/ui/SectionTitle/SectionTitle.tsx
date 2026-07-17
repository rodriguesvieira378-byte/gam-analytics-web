"use client";

import type { ReactNode } from "react";

import styles from "./SectionTitle.module.css";

export interface SectionTitleProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  live?: boolean;
}

export function SectionTitle({
  title,
  eyebrow,
  description,
  action,
  live = false
}: SectionTitleProps) {
  return (
    <header className={styles.header}>
      <div>
        {eyebrow && (
          <span className={styles.eyebrow}>
            {eyebrow}
          </span>
        )}

        <div className={styles.titleLine}>
          <h2>{title}</h2>

          {live && (
            <span className={styles.live}>
              <i />
              AO VIVO
            </span>
          )}
        </div>

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
  );
}