"use client";

import type { ReactNode } from "react";
import { Card, type CardTone } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
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
  return (
    <Card
      tone={tone}
      interactive
      className={styles.card}
    >
      <div className={styles.top}>
        <span className={styles.title}>{title}</span>

        {icon && (
          <span className={styles.icon}>
            {icon}
          </span>
        )}
      </div>

      <strong className={styles.value}>
        {value}
      </strong>

      <div className={styles.meta}>
        <small>{subtitle}</small>

        {badge && (
          <Badge
            tone={badgeTone}
            size="sm"
          >
            {badge}
          </Badge>
        )}
      </div>

      {typeof progress === "number" && (
        <Progress
          value={progress}
          tone={
            tone === "green"
              ? "green"
              : tone === "yellow"
                ? "yellow"
                : tone === "red"
                  ? "red"
                  : "blue"
          }
          size="sm"
        />
      )}
    </Card>
  );
}

export default KPICard;
