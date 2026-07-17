"use client";

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

export function DashboardHeader({
  month,
  week,
  onMonthChange,
  onWeekChange
}: DashboardHeaderProps) {
  return (
    <header className={styles.header}>
      <SectionTitle
        eyebrow="Centro de comando"
        title="Centro Operacional G.A.M."
        description="Monitoramento da operação, sincronização e produtividade em tempo real."
        live
      />

      <div className={styles.right}>
        <div className={styles.status}>
          <StatusDot
            status="online"
            size="sm"
            label="Sistema operacional"
          />
        </div>

        <div className={styles.filters}>
          <Select
            aria-label="Selecionar mês"
            value={month}
            options={monthOptions}
            onChange={(event) =>
              onMonthChange(Number(event.target.value))
            }
          />

          <Select
            aria-label="Selecionar semana"
            value={week}
            options={weekOptions}
            onChange={(event) =>
              onWeekChange(Number(event.target.value))
            }
          />
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
