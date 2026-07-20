"use client";

import type { ReactNode } from "react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card, type CardTone } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

import styles from "./KPICard.module.css";

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  tone?: CardTone;
  badge?: string;
  badgeTone?: BadgeTone;
  progress?: number;
  icon?: ReactNode;
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function progressTone(
  tone: CardTone
): "blue" | "green" | "yellow" | "red" {
  if (tone === "green") return "green";
  if (tone === "yellow") return "yellow";
  if (tone === "red") return "red";
  return "blue";
}

export function KPICard({
  title,
  value,
  subtitle,
  tone = "blue",
  badge,
  badgeTone = "blue",
  progress,
  icon
}: KPICardProps) {
  const hasProgress = typeof progress === "number";
  const safeProgress = hasProgress
    ? clampProgress(progress)
    : 0;

  return (
    <Card
      tone={tone}
      interactive
      className={styles.card}
    >
      <div className={styles.top}>
        <span className={styles.title}>
          {title}
        </span>

        {icon ? (
          <span
            className={styles.icon}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>

      <strong
        className={styles.value}
        title={String(value)}
      >
        {value}
      </strong>

      <div className={styles.meta}>
        <small>{subtitle}</small>

        {badge ? (
          <Badge
            tone={badgeTone}
            size="sm"
          >
            {badge}
          </Badge>
        ) : null}
      </div>

      {hasProgress ? (
        <div
          className={styles.progress}
          aria-label={`${title}: ${safeProgress}%`}
        >
          <Progress
            value={safeProgress}
            tone={progressTone(tone)}
            size="sm"
          />
        </div>
      ) : null}
    </Card>
  );
}

export default KPICard;
