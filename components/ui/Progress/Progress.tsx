"use client";

import styles from "./Progress.module.css";

export type ProgressTone =
  | "blue"
  | "green"
  | "yellow"
  | "red";

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: ProgressTone;
  size?: "sm" | "md";
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  tone = "blue",
  size = "md"
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;

  const percentage = Math.max(
    0,
    Math.min(100, (value / safeMax) * 100)
  );

  return (
    <div className={styles.wrapper}>
      {(label || showValue) && (
        <div className={styles.header}>
          <span>{label}</span>

          {showValue && (
            <strong>{Math.round(percentage)}%</strong>
          )}
        </div>
      )}

      <div
        className={[
          styles.track,
          styles[size]
        ].join(" ")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={value}
      >
        <span
          className={styles[tone]}
          style={{
            width: `${percentage}%`
          }}
        />
      </div>
    </div>
  );
}