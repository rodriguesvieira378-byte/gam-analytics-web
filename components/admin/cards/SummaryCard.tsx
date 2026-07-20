import type {
  ComponentProps
} from "react";

import { Card } from "@/components/ui/Card";

import styles from "../AdminModule.module.css";

type CardTone = NonNullable<
  ComponentProps<typeof Card>["tone"]
>;

export interface SummaryCardProps {
  tone: CardTone;
  label: string;
  value: number;
  description: string;
}

export function SummaryCard({
  tone,
  label,
  value,
  description
}: SummaryCardProps) {
  return (
    <Card
      tone={tone}
      className={styles.summaryCard}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </Card>
  );
}
