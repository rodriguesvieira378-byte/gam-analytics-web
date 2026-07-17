"use client";

import type {
  HTMLAttributes,
  ReactNode
} from "react";

import styles from "./Badge.module.css";

export type BadgeTone =
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "purple"
  | "neutral";

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: BadgeTone;
  size?: "sm" | "md";
}

export function Badge({
  children,
  tone = "blue",
  size = "md",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        styles.badge,
        styles[tone],
        styles[size],
        className
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}