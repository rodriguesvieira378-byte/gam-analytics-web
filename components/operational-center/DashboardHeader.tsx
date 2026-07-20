"use client";

import type { ChangeEvent } from "react";

import { MONTHS, WEEKS } from "@/lib/constants";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Select } from "@/components/ui/Select";
import { StatusDot } from "@/components/ui/StatusDot";

import styles from "./DashboardHeader.module.css";

export interface DashboardHeaderProps {
  month: number;
  week: number;
  onMonthChange: (month: number) => void;
  onWeekChange: (week: number) => void;
}

const monthOptions = MONTHS.map((label, index) => ({
  value: index + 1,
  label
}));

const weekOptions = WEEKS.map((value) => ({
  value,
  label: `Semana ${value}`
}));

function parseSelectNumber(
  event: ChangeEvent<HTMLSelectElement>
) {
  const value = Number(event.target.value);

  return Number.isFinite(value) ? value : 0;
}

export function DashboardHeader({
  month,
  week,
  onMonthChange,
  onWeekChange
}: DashboardHeaderProps) {
  function handleMonthChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const nextMonth = parseSelectNumber(event);

    if (nextMonth > 0) {
      onMonthChange(nextMonth);
    }
  }

  function handleWeekChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const nextWeek = parseSelectNumber(event);

    if (nextWeek > 0) {
      onWeekChange(nextWeek);
    }
  }

  return (
    <header
      className={styles.header}
      aria-label="Cabeçalho do centro operacional"
    >
      <SectionTitle
        eyebrow="Centro de comando"
        title="Centro Operacional G.A.M."
        description="Monitoramento da operação, sincronização e produtividade em tempo real."
        live
      />

      <div className={styles.right}>
        <div
          className={styles.status}
          aria-label="Status do sistema"
        >
          <StatusDot
            status="online"
            size="sm"
            label="Sistema operacional"
          />
        </div>

        <div
          className={styles.filters}
          aria-label="Filtros do período"
        >
          <Select
            aria-label="Selecionar mês"
            value={month}
            options={monthOptions}
            onChange={handleMonthChange}
          />

          <Select
            aria-label="Selecionar semana"
            value={week}
            options={weekOptions}
            onChange={handleWeekChange}
          />
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
