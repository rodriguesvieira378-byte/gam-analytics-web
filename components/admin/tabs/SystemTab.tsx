import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";

import styles from "../AdminModule.module.css";

interface SystemTabProps {
  onBackup: () => void;
}

export function SystemTab({
  onBackup
}: SystemTabProps) {
  return (
    <section className={styles.systemGrid}>
      <Card className={styles.systemCard}>
        <div className={styles.cardHeader}>
          <span>Integridade</span>
          <h3>Backup do sistema</h3>
          <p>
            Gere uma cópia completa dos dados operacionais.
          </p>
        </div>

        <Button onClick={onBackup}>
          Gerar backup completo
        </Button>
      </Card>

      <Card className={styles.systemCard}>
        <div className={styles.cardHeader}>
          <span>Ambiente</span>
          <h3>Status do sistema</h3>
          <p>
            Serviços principais utilizados pelo GAM Analytics.
          </p>
        </div>

        <div className={styles.serviceList}>
          <div>
            <StatusDot
              status="online"
              size="sm"
            />
            <span>Supabase</span>
            <Badge tone="green" size="sm">
              Online
            </Badge>
          </div>

          <div>
            <StatusDot
              status="online"
              size="sm"
            />
            <span>GAM Sync</span>
            <Badge tone="green" size="sm">
              Online
            </Badge>
          </div>

          <div>
            <StatusDot
              status="development"
              size="sm"
            />
            <span>Discord Bot</span>
            <Badge tone="blue" size="sm">
              Desenvolvimento
            </Badge>
          </div>
        </div>
      </Card>
    </section>
  );
}
