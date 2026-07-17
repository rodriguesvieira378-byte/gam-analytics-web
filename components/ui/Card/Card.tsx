"use client";

import type {
  HTMLAttributes,
  ReactNode
} from "react";

import styles from "./Card.module.css";

export type CardTone =
  | "default"
  | "blue"
  | "green"
  | "yellow"
  | "red";

export interface CardProps
  extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  tone?: CardTone;
  interactive?: boolean;
}

export function Card({
  children,
  tone = "default",
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <article
      className={[
        styles.card,
        styles[tone],
        interactive ? styles.interactive : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </article>
  );
}