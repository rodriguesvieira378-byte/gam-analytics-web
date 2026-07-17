"use client";

import type { ReactNode } from "react";

import { Card, type CardTone } from "../Card";
import styles from "./MetricCard.module.css";

export type MetricTrend =
  | "up"
  | "down"
  | "neutral";

export interface MetricCardProps {
  title: string;
  value: string | number;

  subtitle?: string;

  trend?: MetricTrend;

  trendLabel?: string;

  tone?: CardTone;

  icon?: ReactNode;

  progress?: number;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend = "neutral",
  trendLabel,
  tone = "blue",
  icon,
  progress
}: MetricCardProps) {
  const normalizedProgress =
    typeof progress === "number"
      ? Math.max(0, Math.min(100, progress))
      : null;

  return (
    <Card
      tone={tone}
      className={styles.card}
      interactive
    >
      <div className={styles.header}>
        <div>
          <span className={styles.title}>
            {title}
          </span>
        </div>

        {icon && (
          <div className={styles.icon}>
            {icon}
          </div>
        )}
      </div>

      <strong className={styles.value}>
        {value}
      </strong>

      <div className={styles.footer}>
        {trendLabel && (
          <span
            className={`${styles.trend} ${styles[trend]}`}
          >
            {trend === "up"
              ? "▲"
              : trend === "down"
              ? "▼"
              : "•"}

            {" "}

            {trendLabel}
          </span>
        )}

        {subtitle && (
          <small>{subtitle}</small>
        )}
      </div>

      {normalizedProgress !== null && (
        <div className={styles.progress}>
          <span
            style={{
              width: `${normalizedProgress}%`
            }}
          />
        </div>
      )}
    </Card>
  );
}