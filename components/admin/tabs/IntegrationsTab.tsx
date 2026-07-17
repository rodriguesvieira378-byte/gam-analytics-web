import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";

import styles from "../AdminModule.module.css";

export function IntegrationsTab() {
  return (
    <section className={styles.integrationGrid}>
      <Card className={styles.integrationCard}>
        <div className={styles.integrationTop}>
          <StatusDot
            status="online"
            size="sm"
          />

          <div>
            <h3>Supabase</h3>
            <p>
              Autenticação, banco de dados e armazenamento.
            </p>
          </div>

          <Badge tone="green" size="sm">
            Conectado
          </Badge>
        </div>
      </Card>

      <Card className={styles.integrationCard}>
        <div className={styles.integrationTop}>
          <StatusDot
            status="online"
            size="sm"
          />

          <div>
            <h3>GAM Sync</h3>
            <p>
              Processamento dos registros operacionais.
            </p>
          </div>

          <Badge tone="green" size="sm">
            Ativo
          </Badge>
        </div>
      </Card>

      <Card className={styles.integrationCard}>
        <div className={styles.integrationTop}>
          <StatusDot
            status="development"
            size="sm"
          />

          <div>
            <h3>Discord Bot</h3>
            <p>
              Integração automática com os canais da unidade.
            </p>
          </div>

          <Badge tone="blue" size="sm">
            Próxima sprint
          </Badge>
        </div>
      </Card>
    </section>
  );
}
