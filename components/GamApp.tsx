"use client";

import Image from "next/image";
import { GamSyncPanel } from "@/lib/gam-sync/GamSyncPanel";
import OperationalCenter from "./dashboard/OperationalCenter";
import { OfficersModule } from "./officers";
import { OperationsModule } from "./operations";
import { ReportsModule } from "./reports";
import { AuditModule } from "./audit";
import { AdminModule } from "./admin";
import {
  GamAppProvider,
  useGamApp
} from "./providers/GamAppProvider";
import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  MONTHS,
  WEEKS
} from "@/lib/constants";
import { createId, getMetrics } from "@/lib/calculations";
import {
  addGamMember,
  approveGamMember,
  closeMonth,
  deleteDiscordRecord,
  deleteEntry,
  loadAuditLogs,
  loadClosures,
  loadDiscordRecords,
  loadEntries,
  loadGamMembers,
  loadNotificationReads,
  loadOfficers,
  loadSession,
  markNotificationsRead,
  normalizeDiscordMessageUrl,
  rejectGamMember,
  reviewDiscordRecord,
  saveDiscordRecord,
  saveDiscordRecordsBatch,
  saveEntry,
  saveOfficer,
  uploadOfficerPhoto,
  removeOfficerPhoto,
  setNotificationRead,
  requestGamAccess,
  signIn,
  signOut,
  updateGamMember
} from "@/lib/repository";
import {
  completePasswordRecoverySession,
  isPasswordRecoveryUrl,
  requestPasswordReset,
  updateCurrentUserPassword
} from "@/lib/auth-password";
import { isDemoMode } from "@/lib/supabase";
import type {
  AppRole,
  AuditLog,
  DiscordActivityType,
  DiscordRecord,
  DiscordRecordInput,
  GamMember,
  MonthClosure,
  NotificationCategory,
  NotificationRead,
  NotificationSeverity,
  Officer,
  OfficerMetrics,
  OperationalNotification,
  OfficerGarrison,
  OfficerRole,
  OfficerStatus,
  Screen,
  UserAccess,
  WeeklyEntry
} from "@/lib/types";

const PAGE_META: Record<Screen, [string, string]> = {
  dashboard: ["Centro Operacional", "Visão geral da operação em tempo real"],
  notificacoes: ["Notificações", "Alertas e pendências operacionais"],
  efetivo: ["Efetivo", "Cadastro central da unidade"],
  lancamentos: ["Lançamentos", "Registro semanal de atividades"],
  discord: ["Registro Discord", "Registro individual ou em lote com comprovação"],
  supervisao: ["Supervisão", "Leitura simplificada do efetivo"],
  inteligencia: ["Inteligência", "Alertas e evolução operacional"],
  relatorio: ["Relatório Comando", "Resumo pronto para apresentação"],
  fechamento: ["Fechamento", "Conferência final do período"],
  auditoria: ["Auditoria", "Histórico e segurança operacional"],
  acessos: ["Acessos", "Usuários e níveis de permissão"]
};

type Toast = { message: string; kind: "success" | "error" };
type ConfirmationRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  requiredText?: string;
  onConfirm: () => Promise<void> | void;
};
type DiscordMode = "individual" | "lote";
type ReportMode = "semanal" | "mensal";
type DiscordBatchDraft = {
  id: string;
  officerId: string;
  activityType: DiscordActivityType;
  quantity: number;
  discordUrl: string;
  note: string;
};

type DiscordBatchRowValidation = {
  rowId: string;
  normalizedUrl: string;
  errors: string[];
};

function createBatchDraft(id = createId("batch")): DiscordBatchDraft {
  return {
    id,
    officerId: "",
    activityType: "Prisão",
    quantity: 1,
    discordUrl: "",
    note: ""
  };
}

function createInitialBatchRows() {
  return [1, 2, 3].map((index) =>
    createBatchDraft(`batch-inicial-${index}`)
  );
}

function readAuditValue(
  data: Record<string, unknown> | null,
  ...keys: string[]
) {
  if (!data) return undefined;
  for (const key of keys) {
    if (key in data) return data[key];
  }
  return undefined;
}

function formatDateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function auditModuleLabel(entity: string) {
  const labels: Record<string, string> = {
    officers: "Efetivo",
    weekly_entries: "Lançamentos",
    discord_records: "Discord",
    gam_members: "Acessos",
    monthly_closures: "Fechamento"
  };
  return labels[entity] ?? entity;
}

function auditActionLabel(log: AuditLog) {
  if (log.entity === "discord_records" && log.action === "UPDATE") {
    const oldStatus = String(readAuditValue(log.oldData, "status") ?? "");
    const newStatus = String(readAuditValue(log.newData, "status") ?? "");
    if (oldStatus === "Pendente" && newStatus === "Aprovado") return "Aprovou";
    if (oldStatus === "Pendente" && newStatus === "Rejeitado") return "Rejeitou";
  }

  if (log.entity === "gam_members" && log.action === "UPDATE") {
    const oldActive = Boolean(readAuditValue(log.oldData, "active"));
    const newActive = Boolean(readAuditValue(log.newData, "active"));
    if (oldActive && !newActive) return "Desativou";
    if (!oldActive && newActive) return "Reativou";
  }

  if (log.entity === "monthly_closures") {
    return log.action === "INSERT" ? "Fechou mês" : "Atualizou fechamento";
  }

  if (log.action === "INSERT") return "Criou";
  if (log.action === "UPDATE") return "Alterou";
  if (log.action === "DELETE") return "Excluiu";
  return log.action;
}

function auditActionClass(log: AuditLog) {
  const label = auditActionLabel(log);
  if (["Criou", "Aprovou", "Reativou", "Fechou mês"].includes(label)) {
    return "positive";
  }
  if (["Excluiu", "Rejeitou", "Desativou"].includes(label)) {
    return "negative";
  }
  return "neutral";
}

function getAuditOfficerId(log: AuditLog) {
  const data = log.newData ?? log.oldData;
  const value = readAuditValue(data, "officer_id", "officerId");
  return value ? String(value) : "";
}

function auditTargetLabel(log: AuditLog, officers: Officer[]) {
  const data = log.newData ?? log.oldData;
  if (!data) return log.entityId;

  if (log.entity === "officers") {
    const registration = readAuditValue(data, "registration");
    const name = readAuditValue(data, "name");
    return [registration, name].filter(Boolean).join(" — ") || log.entityId;
  }

  if (log.entity === "weekly_entries" || log.entity === "discord_records") {
    const officerId = getAuditOfficerId(log);
    const officer = officers.find((item) => item.id === officerId);
    const week = readAuditValue(data, "week");
    const month = readAuditValue(data, "month");
    const year = readAuditValue(data, "year");
    const period = week
      ? `S${week} • ${month}/${year}`
      : month
        ? `${month}/${year}`
        : "";
    return [officer?.name ?? "Integrante", period].filter(Boolean).join(" — ");
  }

  if (log.entity === "gam_members") {
    return String(
      readAuditValue(data, "display_name", "displayName", "email") ??
        log.entityId
    );
  }

  if (log.entity === "monthly_closures") {
    const month = Number(readAuditValue(data, "month") ?? 0);
    const year = readAuditValue(data, "year");
    return month >= 1 && month <= 12
      ? `${MONTHS[month - 1]} de ${year}`
      : log.entityId;
  }

  return log.entityId;
}

function auditSummary(log: AuditLog) {
  const data = log.newData ?? log.oldData;
  if (!data) return "Ação registrada pelo sistema.";

  if (log.entity === "weekly_entries") {
    const prisons = readAuditValue(data, "prisons") ?? 0;
    const pursuits = readAuditValue(data, "pursuits") ?? 0;
    return `${prisons} prisão(ões) • ${pursuits} acompanhamento(s)`;
  }

  if (log.entity === "discord_records") {
    const type = readAuditValue(data, "activity_type", "activityType") ?? "Atividade";
    const quantity = readAuditValue(data, "quantity") ?? 0;
    const status = readAuditValue(data, "status") ?? "";
    return `${type}: ${quantity} • ${status}`;
  }

  if (log.entity === "officers") {
    const role = readAuditValue(data, "role") ?? "";
    const status = readAuditValue(data, "status") ?? "";
    return [role, status].filter(Boolean).join(" • ");
  }

  if (log.entity === "gam_members") {
    const role = readAuditValue(data, "role") ?? "";
    const active = Boolean(readAuditValue(data, "active"));
    return `${role} • ${active ? "Ativo" : "Inativo"}`;
  }

  if (log.entity === "monthly_closures") {
    const hash = String(
      readAuditValue(data, "integrity_hash", "integrityHash") ?? ""
    );
    return hash ? `Integridade ${hash.slice(0, 12)}…` : "Período arquivado";
  }

  return "Ação registrada pelo sistema.";
}

const AUDIT_FIELD_LABELS: Record<string, string> = {
  registration: "Matrícula",
  name: "Nome",
  role: "Cargo / permissão",
  garrison: "Guarnição",
  status: "Status",
  prison_goal: "Meta de prisões",
  prisonGoal: "Meta de prisões",
  pursuit_goal: "Meta de acompanhamentos",
  pursuitGoal: "Meta de acompanhamentos",
  prisons: "Prisões",
  pursuits: "Acompanhamentos",
  note: "Observação",
  week: "Semana",
  month: "Mês",
  year: "Ano",
  activity_type: "Tipo",
  activityType: "Tipo",
  quantity: "Quantidade",
  discord_url: "Link Discord",
  discordUrl: "Link Discord",
  rejection_reason: "Motivo da rejeição",
  rejectionReason: "Motivo da rejeição",
  approval_applied: "Contabilizado",
  approvalApplied: "Contabilizado",
  display_name: "Nome exibido",
  displayName: "Nome exibido",
  email: "E-mail",
  active: "Ativo",
  integrity_hash: "Hash de integridade",
  integrityHash: "Hash de integridade"
};

function displayAuditValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getAuditChanges(log: AuditLog) {
  const ignored = new Set([
    "id",
    "owner_id",
    "ownerId",
    "officer_id",
    "officerId",
    "created_at",
    "createdAt",
    "updated_at",
    "updatedAt",
    "submitted_by",
    "submittedBy",
    "reviewed_by",
    "reviewedBy",
    "reviewed_at",
    "reviewedAt",
    "snapshot"
  ]);
  const keys = new Set([
    ...Object.keys(log.oldData ?? {}),
    ...Object.keys(log.newData ?? {})
  ]);

  return [...keys]
    .filter((key) => !ignored.has(key))
    .map((key) => ({
      key,
      label: AUDIT_FIELD_LABELS[key] ?? key,
      before: log.oldData?.[key],
      after: log.newData?.[key]
    }))
    .filter((item) =>
      log.action === "UPDATE"
        ? JSON.stringify(item.before) !== JSON.stringify(item.after)
        : true
    );
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}


function notificationHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function notificationPeriodLabel(year: number, month: number, week: number) {
  return `Semana ${week} • ${MONTHS[month - 1]} de ${year}`;
}

function buildOperationalNotifications({
  metrics,
  discordRecords,
  entries,
  closures,
  year,
  month,
  week,
  canOperate,
  canReview,
  canClose
}: {
  metrics: OfficerMetrics[];
  discordRecords: DiscordRecord[];
  entries: WeeklyEntry[];
  closures: MonthClosure[];
  year: number;
  month: number;
  week: number;
  canOperate: boolean;
  canReview: boolean;
  canClose: boolean;
}): Omit<OperationalNotification, "read">[] {
  const periodLabel = notificationPeriodLabel(year, month, week);
  const notifications: Omit<OperationalNotification, "read">[] = [];
  const periodDiscord = discordRecords.filter(
    (record) =>
      record.year === year && record.month === month && record.week === week
  );
  const pending = periodDiscord.filter((record) => record.status === "Pendente");
  const rejected = periodDiscord.filter((record) => record.status === "Rejeitado");

  if (canReview && pending.length > 0) {
    const latest = [...pending]
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))[0];
    const seed = pending.map((record) => record.id).sort().join("|");
    notifications.push({
      id: `aprovacao:${year}-${month}-${week}:${notificationHash(seed)}`,
      category: "aprovacao",
      severity: pending.length >= 5 ? "critical" : "warning",
      title: `${pending.length} registro(s) aguardando aprovação`,
      message:
        pending.length === 1
          ? "Existe uma comprovação do Discord pendente de análise da supervisão."
          : "Existem comprovações do Discord pendentes de análise da supervisão.",
      periodLabel,
      targetScreen: "discord",
      actionLabel: "Analisar registros",
      createdAt: latest?.createdAt
    });
  }

  if (rejected.length > 0) {
    const seed = rejected.map((record) => record.id).sort().join("|");
    notifications.push({
      id: `rejeitados:${year}-${month}-${week}:${notificationHash(seed)}`,
      category: "aprovacao",
      severity: "warning",
      title: `${rejected.length} registro(s) rejeitado(s)`,
      message:
        "Revise os motivos informados pela supervisão antes de enviar novas comprovações.",
      periodLabel,
      targetScreen: "discord",
      actionLabel: "Ver rejeições"
    });
  }

  for (const metric of metrics) {
    if (metric.situation === "SEM REGISTRO") {
      notifications.push({
        id: `sem-registro:${year}-${month}-${week}:${metric.id}`,
        category: "registro",
        severity: "critical",
        title: `${metric.name} está sem registro`,
        message: `${metric.registration} ainda não possui prisões nem acompanhamentos no período selecionado.`,
        periodLabel,
        targetScreen: canOperate ? "lancamentos" : "supervisao",
        actionLabel: canOperate ? "Registrar atividade" : "Ver supervisão",
        officerId: metric.id
      });
      continue;
    }

    if (metric.situation === "ABAIXO DA META") {
      notifications.push({
        id: `abaixo-meta:${year}-${month}-${week}:${metric.id}`,
        category: "meta",
        severity: "warning",
        title: `${metric.name} está abaixo da meta`,
        message: `${metric.total} atividade(s) registradas. Progresso atual de ${metric.progress}%.`,
        periodLabel,
        targetScreen: "supervisao",
        actionLabel: "Acompanhar desempenho",
        officerId: metric.id
      });
    }
  }

  const monthEntries = entries.filter(
    (entry) => entry.year === year && entry.month === month
  );
  const monthClosed = closures.some(
    (closure) => closure.year === year && closure.month === month
  );

  if (canClose && monthEntries.length > 0 && !monthClosed) {
    notifications.push({
      id: `fechamento:${year}-${month}`,
      category: "fechamento",
      severity: week === 5 ? "critical" : "info",
      title: `${MONTHS[month - 1]} ainda não foi fechado`,
      message:
        week === 5
          ? "O período está na última semana e o fechamento mensal ainda não foi arquivado."
          : "O fechamento permanece disponível após a conferência dos lançamentos do mês.",
      periodLabel: `${MONTHS[month - 1]} de ${year}`,
      targetScreen: "fechamento",
      actionLabel: "Conferir fechamento"
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      id: `sistema-ok:${year}-${month}-${week}`,
      category: "sistema",
      severity: "success",
      title: "Operação sem pendências críticas",
      message: "Nenhum alerta operacional foi identificado para o período selecionado.",
      periodLabel,
      targetScreen: "dashboard",
      actionLabel: "Voltar ao dashboard"
    });
  }

  const severityOrder: Record<NotificationSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    success: 3
  };

  return notifications.sort((a, b) => {
    const severity = severityOrder[a.severity] - severityOrder[b.severity];
    if (severity !== 0) return severity;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

function notificationSeverityLabel(severity: NotificationSeverity) {
  const labels: Record<NotificationSeverity, string> = {
    critical: "Crítica",
    warning: "Atenção",
    info: "Informativa",
    success: "Tudo certo"
  };
  return labels[severity];
}

function notificationCategoryLabel(category: NotificationCategory) {
  const labels: Record<NotificationCategory, string> = {
    aprovacao: "Aprovações",
    registro: "Registros",
    meta: "Metas",
    fechamento: "Fechamento",
    sistema: "Sistema"
  };
  return labels[category];
}

function Badge({ text }: { text: string }) {
  const className =
    text === "META ATINGIDA" ||
    text === "Ativo" ||
    text === "Aprovado" ||
    text === "Administrador"
      ? "badge green"
      : text === "META PARCIAL" ||
          text === "PRÓXIMO DA META" ||
          text === "Pendente" ||
          text === "Supervisor"
        ? "badge yellow"
        : text === "INATIVO" ||
            text === "Inativo" ||
            text === "Prisão" ||
            text === "SEM REGISTRO" ||
            text === "ABAIXO DA META" ||
            text === "Rejeitado"
          ? "badge red"
          : "badge blue";

  return <span className={className}>{text}</span>;
}

function Selectors({
  month,
  week,
  onMonth,
  onWeek,
  hideWeek = false
}: {
  month: number;
  week: number;
  onMonth: (value: number) => void;
  onWeek: (value: number) => void;
  hideWeek?: boolean;
}) {
  return (
    <div className="filters">
      <select
        value={month}
        onChange={(event) => onMonth(Number(event.target.value))}
        aria-label="Mês analisado"
      >
        {MONTHS.map((label, index) => (
          <option key={label} value={index + 1}>
            {label}
          </option>
        ))}
      </select>
      {!hideWeek && (
        <select
          value={week}
          onChange={(event) => onWeek(Number(event.target.value))}
          aria-label="Semana analisada"
        >
          {WEEKS.map((item) => (
            <option key={item} value={item}>
              Semana {item}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

type LoginMode = "login" | "recovery" | "signup";

function LoginScreen({
  onAuthenticated
}: {
  onAuthenticated: (access: UserAccess) => void;
}) {
  const [mode, setMode] = useState<LoginMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [signupNeedsConfirmation, setSignupNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  function changeMode(nextMode: LoginMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setSignupCompleted(false);
    setSignupNeedsConfirmation(false);
    setEmail("");
    setPassword("");
    setConfirmation("");
  }

  async function handleRecoverySubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;

      await requestPasswordReset(email, redirectTo);

      setMessage(
        "Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha."
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível enviar o link de recuperação."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const result = await requestGamAccess({
        displayName,
        email,
        password
      });

      setSignupNeedsConfirmation(
        result.needsEmailConfirmation
      );
      setSignupCompleted(true);
      setMessage("");
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar sua solicitação de acesso."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const authenticatedAccess = await signIn(email, password);
      onAuthenticated(authenticatedAccess);
    } catch (cause) {
      if (
        cause instanceof Error &&
        cause.message === "Invalid login credentials"
      ) {
        setError(
          "E-mail ou senha incorretos.\nVerifique os dados e tente novamente."
        );
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível realizar o login. Tente novamente."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const submitHandler =
    mode === "recovery"
      ? handleRecoverySubmit
      : mode === "signup"
        ? handleSignupSubmit
        : handleSubmit;

  if (mode === "signup" && signupCompleted) {
    return (
      <main className="login">
        <section className="login-card">
          <div className="login-hero">
            <div>
              <Image
                className="login-brand-logo"
                src="/gam-logo.png"
                alt="GAM Analytics"
                width={920}
                height={260}
                priority
              />
              <h1 className="sr-only">
                Solicitação enviada
              </h1>
              <p>
                Seu pedido de acesso ao GAM Analytics foi registrado com segurança.
              </p>
            </div>

            <div className="hero-tags">
              <span className="tag">OÁSIS RP</span>
              <span className="tag">Acesso privado</span>
              <span className="tag">Status pendente</span>
            </div>
          </div>

          <section className="login-form">
            <div
              style={{
                display: "grid",
                gap: 14,
                textAlign: "center"
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 58,
                  height: 58,
                  margin: "0 auto",
                  borderRadius: "50%",
                  fontSize: 28,
                  background: "rgba(31, 195, 122, 0.12)",
                  border: "1px solid rgba(31, 195, 122, 0.35)"
                }}
              >
                ✓
              </div>

              <div>
                <h2>Solicitação enviada</h2>
                <p>
                  A administração da G.A.M. analisará seu cadastro.
                </p>
              </div>

              <div className="demo-note">
                <strong>Status: Aguardando aprovação</strong>
                <br />
                {signupNeedsConfirmation
                  ? "Confirme também o e-mail enviado pelo Supabase antes de tentar entrar."
                  : "Você poderá entrar assim que um administrador aprovar seu acesso."}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: 12,
                  textAlign: "left",
                  borderRadius: 10,
                  background: "rgba(5, 19, 33, 0.68)",
                  border: "1px solid rgba(39, 83, 119, 0.55)"
                }}
              >
                <span>1. Solicitação registrada</span>
                <span>2. Análise administrativa</span>
                <span>3. Liberação do acesso</span>
              </div>

              <button
                type="button"
                className="btn"
                onClick={() => changeMode("login")}
              >
                Voltar para o login
              </button>
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="login">
      <section className="login-card">
        <div className="login-hero">
          <div>
            <Image
              className="login-brand-logo"
              src="/gam-logo.png"
              alt="GAM Analytics"
              width={920}
              height={260}
              priority
            />
            <h1 className="sr-only">GAM Analytics Web</h1>
            <p>
              Gestão operacional da unidade G.A.M com lançamentos semanais,
              acompanhamento do efetivo, inteligência e relatórios.
            </p>
          </div>

          <div className="hero-tags">
            <span className="tag">OÁSIS RP</span>
            <span className="tag">Acesso privado</span>
            <span className="tag">Desktop e celular</span>
            <span className="tag">
              {isDemoMode ? "Modo demonstração" : "Banco online"}
            </span>
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={submitHandler}
          autoComplete="off"
        >
          <h2>
            {mode === "recovery"
              ? "Recuperar senha"
              : mode === "signup"
                ? "Solicitar acesso"
                : "Acesso ao GAM Analytics"}
          </h2>

          <p>
            {mode === "recovery"
              ? "Informe seu e-mail para receber o link de redefinição."
              : mode === "signup"
                ? "Crie sua conta. O acesso será liberado após aprovação administrativa."
                : "Entre com o usuário autorizado pela administração da unidade."}
          </p>

          {mode === "signup" && (
            <label className="field">
              <span>Nome exibido</span>
              <input
                value={displayName}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                placeholder="Ex.: Cássio Vieira"
                required
                autoComplete="name"
              />
            </label>
          )}

          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              name="gam-access-email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>

          {mode !== "recovery" && (
            <label className="field">
              <span>Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                minLength={mode === "signup" ? 8 : undefined}
                required
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
              />
            </label>
          )}

          {mode === "signup" && (
            <label className="field">
              <span>Confirmar senha</span>
              <input
                type="password"
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(event.target.value)
                }
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
          )}

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {message && (
            <div className="demo-note">
              {message}
            </div>
          )}

          {mode === "login" ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 2
              }}
            >
              <button
                type="button"
                className="btn secondary"
                onClick={() => changeMode("signup")}
              >
                Criar conta
              </button>

              <button
                className="btn"
                type="submit"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar no sistema"}
              </button>

              <button
                type="button"
                className="btn ghost"
                onClick={() => changeMode("recovery")}
              >
                Esqueci minha senha
              </button>
            </div>
          ) : (
            <>
              <button
                className="btn"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? mode === "recovery"
                    ? "Enviando..."
                    : "Criando solicitação..."
                  : mode === "recovery"
                    ? "Enviar link de recuperação"
                    : "Criar conta e solicitar acesso"}
              </button>

              <button
                type="button"
                className="btn ghost"
                style={{ marginTop: 10 }}
                onClick={() => changeMode("login")}
              >
                Voltar para o login
              </button>
            </>
          )}

          {isDemoMode && (
            <div className="demo-note">
              O cadastro e a recuperação por e-mail funcionam após conectar o Supabase.
            </div>
          )}
        </form>
      </section>
    </main>
  );
}

function PasswordRecoveryGate({
  children
}: {
  children: ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepareRecovery() {
      try {
        const recovery = isPasswordRecoveryUrl();

        if (!recovery) {
          if (mounted) setRecoveryMode(false);
          return;
        }

        await completePasswordRecoverySession();

        if (mounted) {
          setRecoveryMode(true);
        }
      } catch (cause) {
        if (mounted) {
          setRecoveryMode(true);
          setError(
            cause instanceof Error
              ? cause.message
              : "O link de recuperação é inválido ou expirou."
          );
        }
      } finally {
        if (mounted) setChecking(false);
      }
    }

    void prepareRecovery();

    return () => {
      mounted = false;
    };
  }, []);

  async function handlePasswordUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError(
        "A nova senha precisa ter pelo menos 8 caracteres."
      );
      return;
    }

    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);

    try {
      await updateCurrentUserPassword(password);
      setMessage(
        "Senha alterada com sucesso. Você já pode voltar ao login."
      );
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível alterar a senha."
      );
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="full-loader">
        Verificando recuperação de senha...
      </div>
    );
  }

  if (!recoveryMode) {
    return <>{children}</>;
  }

  return (
    <main className="login">
      <section className="login-card">
        <div className="login-hero">
          <div>
            <Image
              className="login-brand-logo"
              src="/gam-logo.png"
              alt="GAM Analytics"
              width={920}
              height={260}
              priority
            />
            <h1 className="sr-only">
              Redefinir senha
            </h1>
            <p>
              Crie uma nova senha para voltar a acessar o GAM Analytics.
            </p>
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={handlePasswordUpdate}
        >
          <h2>Definir nova senha</h2>
          <p>
            Use pelo menos 8 caracteres e confirme a senha.
          </p>

          <label className="field">
            <span>Nova senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              minLength={8}
              required
              autoComplete="new-password"
            />
          </label>

          <label className="field">
            <span>Confirmar nova senha</span>
            <input
              type="password"
              value={confirmation}
              onChange={(event) =>
                setConfirmation(event.target.value)
              }
              minLength={8}
              required
              autoComplete="new-password"
            />
          </label>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {message && (
            <div className="demo-note">
              {message}
            </div>
          )}

          <button
            className="btn"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Alterando senha..."
              : "Alterar senha"}
          </button>

          {message && (
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );
                window.location.reload();
              }}
            >
              Voltar para o login
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

function GamAppContent() {
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [year] = useState(() => new Date().getFullYear());
  const {
    period: { month, week },
    sync,
    setMonth,
    setWeek,
    startSync,
    finishSync
  } = useGamApp();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [discordRecords, setDiscordRecords] = useState<DiscordRecord[]>([]);
  const [discordMode, setDiscordMode] = useState<DiscordMode>("individual");
  const [discordBatchRows, setDiscordBatchRows] = useState<DiscordBatchDraft[]>(
    createInitialBatchRows
  );
  const [savingDiscordBatch, setSavingDiscordBatch] = useState(false);
  const [discordOfficerFilter, setDiscordOfficerFilter] = useState("todos");
  const [discordTypeFilter, setDiscordTypeFilter] = useState("todos");
  const [discordStatusFilter, setDiscordStatusFilter] = useState("todos");
  const [discordSearch, setDiscordSearch] = useState("");
  const [closures, setClosures] = useState<MonthClosure[]>([]);
  const [members, setMembers] = useState<GamMember[]>([]);

  useEffect(() => {
    if (
      !access ||
      access.role !== "Administrador" ||
      isDemoMode
    ) {
      return;
    }

    let active = true;

    const refreshMembers = async () => {
      try {
        const nextMembers = await loadGamMembers();

        if (active) {
          setMembers(nextMembers);
        }
      } catch {
        // A atualização principal continua responsável por exibir erros.
      }
    };

    const interval = window.setInterval(
      refreshMembers,
      20000
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [access]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notificationReads, setNotificationReads] = useState<NotificationRead[]>([]);
  const [notificationStatusFilter, setNotificationStatusFilter] = useState("nao-lidas");
  const [notificationSeverityFilter, setNotificationSeverityFilter] = useState("todas");
  const [notificationCategoryFilter, setNotificationCategoryFilter] = useState("todas");
  const [notificationSearch, setNotificationSearch] = useState("");
  const [refreshingNotifications, setRefreshingNotifications] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [profileOfficerId, setProfileOfficerId] = useState<string | null>(null);
  const [savingOfficerPhotoId, setSavingOfficerPhotoId] = useState<string | null>(null);

  const isAdmin = access?.role === "Administrador";
  const canOperate = access?.role === "Administrador" || access?.role === "Supervisor";
  const canReview = canOperate;
  const canClose = isAdmin;
  const canAudit = canOperate;

  const activeOfficers = useMemo(
    () => officers.filter((officer) => officer.status === "Ativo"),
    [officers]
  );

  const metrics = useMemo(
    () =>
      activeOfficers.map((officer) =>
        getMetrics(officer, entries, year, month, week)
      ),
    [activeOfficers, entries, year, month, week]
  );

  const effectiveMetrics = useMemo(
    () =>
      officers.map((officer) =>
        getMetrics(officer, entries, year, month, week)
      ),
    [officers, entries, year, month, week]
  );

  const profileOfficer = useMemo(
    () => officers.find((officer) => officer.id === profileOfficerId) ?? null,
    [officers, profileOfficerId]
  );

  const profileMetric = useMemo(
    () =>
      profileOfficer
        ? getMetrics(profileOfficer, entries, year, month, week)
        : null,
    [profileOfficer, entries, year, month, week]
  );

  const previousMetrics = useMemo(
    () =>
      activeOfficers.map((officer) =>
        getMetrics(
          officer,
          entries,
          year,
          month,
          Math.max(1, week - 1)
        )
      ),
    [activeOfficers, entries, year, month, week]
  );

  const operationalNotifications = useMemo(() => {
    const readIds = new Set(
      notificationReads.map((item) => item.notificationId)
    );
    return buildOperationalNotifications({
      metrics,
      discordRecords,
      entries,
      closures,
      year,
      month,
      week,
      canOperate,
      canReview,
      canClose
    }).map((notification) => ({
      ...notification,
      read:
        notification.severity === "success" || readIds.has(notification.id)
    }));
  }, [
    metrics,
    discordRecords,
    entries,
    closures,
    year,
    month,
    week,
    canOperate,
    canReview,
    canClose,
    notificationReads
  ]);

  const unreadNotifications = useMemo(
    () => operationalNotifications.filter((notification) => !notification.read),
    [operationalNotifications]
  );

  const filteredNotifications = useMemo(() => {
    const term = notificationSearch.trim().toLowerCase();
    return operationalNotifications.filter((notification) => {
      const matchesStatus =
        notificationStatusFilter === "todas" ||
        (notificationStatusFilter === "nao-lidas" && !notification.read) ||
        (notificationStatusFilter === "lidas" && notification.read);
      const matchesSeverity =
        notificationSeverityFilter === "todas" ||
        notification.severity === notificationSeverityFilter;
      const matchesCategory =
        notificationCategoryFilter === "todas" ||
        notification.category === notificationCategoryFilter;
      const matchesSearch =
        !term ||
        notification.title.toLowerCase().includes(term) ||
        notification.message.toLowerCase().includes(term) ||
        notification.periodLabel.toLowerCase().includes(term);
      return matchesStatus && matchesSeverity && matchesCategory && matchesSearch;
    });
  }, [
    notificationCategoryFilter,
    notificationSearch,
    notificationSeverityFilter,
    notificationStatusFilter,
    operationalNotifications
  ]);

  const discordPeriodRecords = useMemo(
    () =>
      discordRecords.filter(
        (record) =>
          record.year === year &&
          record.month === month &&
          record.week === week
      ),
    [discordRecords, year, month, week]
  );

  const filteredDiscordRecords = useMemo(() => {
    const term = discordSearch.trim().toLowerCase();

    return discordPeriodRecords.filter((record) => {
      const officer = officers.find((item) => item.id === record.officerId);
      const matchesOfficer =
        discordOfficerFilter === "todos" ||
        record.officerId === discordOfficerFilter;
      const matchesType =
        discordTypeFilter === "todos" ||
        record.activityType === discordTypeFilter;
      const matchesStatus =
        discordStatusFilter === "todos" ||
        record.status === discordStatusFilter;
      const matchesSearch =
        !term ||
        officer?.name.toLowerCase().includes(term) ||
        officer?.registration.toLowerCase().includes(term) ||
        record.note.toLowerCase().includes(term) ||
        record.discordUrl.toLowerCase().includes(term);

      return matchesOfficer && matchesType && matchesStatus && Boolean(matchesSearch);
    });
  }, [
    discordOfficerFilter,
    discordPeriodRecords,
    discordSearch,
    discordStatusFilter,
    discordTypeFilter,
    officers
  ]);

  const activeDiscordBatchRows = useMemo(
    () =>
      discordBatchRows.filter(
        (row) =>
          row.officerId || row.discordUrl.trim() || row.note.trim()
      ),
    [discordBatchRows]
  );

  const discordBatchValidation = useMemo(() => {
    const existingUrls = new Set(
      discordRecords.map((record) => record.discordUrl)
    );
    const normalizedByRow = new Map<string, string>();
    const counts = new Map<string, number>();

    for (const row of activeDiscordBatchRows) {
      try {
        const normalized = normalizeDiscordMessageUrl(row.discordUrl);
        normalizedByRow.set(row.id, normalized);
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      } catch {
        normalizedByRow.set(row.id, "");
      }
    }

    const rows: DiscordBatchRowValidation[] = activeDiscordBatchRows.map(
      (row) => {
        const errors: string[] = [];
        const normalizedUrl = normalizedByRow.get(row.id) ?? "";

        if (!row.officerId) errors.push("Selecione o integrante");
        if (!Number.isInteger(row.quantity) || row.quantity < 1) {
          errors.push("Quantidade inválida");
        }

        if (!normalizedUrl) {
          errors.push("Link inválido");
        } else {
          if ((counts.get(normalizedUrl) ?? 0) > 1) {
            errors.push("Link repetido no lote");
          }
          if (existingUrls.has(normalizedUrl)) {
            errors.push("Link já cadastrado");
          }
        }

        return { rowId: row.id, normalizedUrl, errors };
      }
    );

    const prisonTotal = activeDiscordBatchRows
      .filter((row) => row.activityType === "Prisão")
      .reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    const pursuitTotal = activeDiscordBatchRows
      .filter((row) => row.activityType === "Acompanhamento")
      .reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);

    return {
      rows,
      hasErrors: rows.some((row) => row.errors.length > 0),
      prisonTotal,
      pursuitTotal
    };
  }, [activeDiscordBatchRows, discordRecords]);

  useEffect(() => {
    let mounted = true;

    loadSession()
      .then((currentAccess) => {
        if (mounted) setAccess(currentAccess);
      })
      .finally(() => {
        if (mounted) setSessionReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const refreshSystemData = useCallback(
    async (showLoader = false) => {
      if (!access) return;

      if (showLoader) {
        setLoading(true);
      }

      startSync();

      try {
        const [
          officerData,
          entryData,
          discordData,
          closureData,
          memberData,
          auditData,
          notificationReadData
        ] = await Promise.all([
          loadOfficers(),
          loadEntries(),
          loadDiscordRecords(),
          loadClosures(),
          loadGamMembers(),
          canAudit
            ? loadAuditLogs()
            : Promise.resolve([]),
          loadNotificationReads()
        ]);

        setOfficers(officerData);
        setEntries(entryData);
        setDiscordRecords(discordData);
        setClosures(closureData);
        setMembers(memberData);
        setAuditLogs(auditData);
        setNotificationReads(notificationReadData);
        finishSync();
      } catch (cause) {
        finishSync();

        setToast({
          message:
            cause instanceof Error
              ? cause.message
              : "Falha ao atualizar os dados.",
          kind: "error"
        });
      } finally {
        setLoading(false);
      }
    },
    [
      access,
      canAudit,
      finishSync,
      startSync
    ]
  );

  useEffect(() => {
    void refreshSystemData(true);
  }, [refreshSystemData]);

  useEffect(() => {
    if (!access) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshSystemData();
      }
    };

    const refreshWhenFocused = () => {
      void refreshSystemData();
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshSystemData();
      }
    }, 60_000);

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );

    window.addEventListener(
      "focus",
      refreshWhenFocused
    );

    return () => {
      window.clearInterval(intervalId);

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );

      window.removeEventListener(
        "focus",
        refreshWhenFocused
      );
    };
  }, [access, refreshSystemData]);

  async function refreshAuditLogs() {
    if (!canAudit) return;
    try {
      setAuditLogs(await loadAuditLogs());
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Falha ao atualizar a auditoria.",
        "error"
      );
    }
  }

  async function handleSetNotificationRead(
    notificationId: string,
    read: boolean,
    showToast = true
  ) {
    try {
      const result = await setNotificationRead(notificationId, read);
      setNotificationReads((current) => {
        const next = current.filter(
          (item) => item.notificationId !== notificationId
        );
        return result ? [result, ...next] : next;
      });
      if (showToast) {
        notify(read ? "Notificação marcada como lida." : "Notificação reaberta.");
      }
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Falha ao atualizar a notificação.",
        "error"
      );
    }
  }

  async function handleMarkAllNotificationsRead() {
    const ids = filteredNotifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);

    if (ids.length === 0) {
      notify("Não há notificações não lidas neste filtro.");
      return;
    }

    try {
      const saved = await markNotificationsRead(ids);
      setNotificationReads((current) => {
        const savedIds = new Set(saved.map((item) => item.notificationId));
        return [
          ...saved,
          ...current.filter((item) => !savedIds.has(item.notificationId))
        ];
      });
      notify(`${ids.length} notificação(ões) marcada(s) como lida(s).`);
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Falha ao marcar as notificações.",
        "error"
      );
    }
  }

  async function handleOpenNotification(notification: OperationalNotification) {
    if (!notification.read) {
      await handleSetNotificationRead(notification.id, true, false);
    }
    setScreen(notification.targetScreen);
    setMenuOpen(false);
  }

  async function handleRefreshNotifications() {
    setRefreshingNotifications(true);
    try {
      const [officerData, entryData, discordData, closureData, readData] =
        await Promise.all([
          loadOfficers(),
          loadEntries(),
          loadDiscordRecords(),
          loadClosures(),
          loadNotificationReads()
        ]);
      setOfficers(officerData);
      setEntries(entryData);
      setDiscordRecords(discordData);
      setClosures(closureData);
      setNotificationReads(readData);
      notify("Alertas atualizados com os dados mais recentes.");
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Falha ao atualizar os alertas.",
        "error"
      );
    } finally {
      setRefreshingNotifications(false);
    }
  }

  function notify(message: string, kind: Toast["kind"] = "success") {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function handleLogout() {
    await signOut();
    setAccess(null);
    setOfficers([]);
    setEntries([]);
    setDiscordRecords([]);
    setMembers([]);
    setAuditLogs([]);
    setNotificationReads([]);
  }

  async function handleSaveOfficer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canOperate) {
      notify("Seu nível de acesso é somente consulta.", "error");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const role = form.get("role") as OfficerRole;
    const garrison = form.get("garrison") as OfficerGarrison;
    const status = form.get("status") as OfficerStatus;
    const registration = String(form.get("registration") ?? "")
      .trim()
      .toUpperCase();
    const name = String(form.get("name") ?? "").trim();
    const discordUrl = String(form.get("discordUrl") ?? "").trim();

    if (!registration || !name) {
      notify("Preencha matrícula e nome.", "error");
      return;
    }

    try {
      const saved = await saveOfficer({
        id: editingOfficer?.id ?? "",
        registration,
        name,
        role,
        garrison,
        status,
        prisonGoal: role === "Oficial GAM" ? 4 : 6,
        pursuitGoal: role === "Oficial GAM" ? 6 : 12,
        photoUrl: editingOfficer?.photoUrl,
        photoPath: editingOfficer?.photoPath,
        discordUrl: discordUrl || undefined
      });

      setOfficers((current) => {
        const index = current.findIndex((item) => item.id === saved.id);
        if (index < 0) return [...current, saved].sort((a, b) =>
          a.registration.localeCompare(b.registration)
        );

        const next = [...current];
        next[index] = saved;
        return next;
      });

      setEditingOfficer(null);
      formElement.reset();
      void refreshAuditLogs();
      notify("Integrante salvo com sucesso.");
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Falha ao salvar integrante.",
        "error"
      );
    }
  }

  function replaceOfficerState(saved: Officer) {
    setOfficers((current) =>
      current
        .map((officer) => (officer.id === saved.id ? saved : officer))
        .sort((a, b) => a.registration.localeCompare(b.registration))
    );
    setEditingOfficer((current) =>
      current?.id === saved.id ? saved : current
    );
  }

  async function handleUploadOfficerPhoto(officer: Officer, file: File) {
    setSavingOfficerPhotoId(officer.id);
    try {
      const saved = await uploadOfficerPhoto(officer, file);
      replaceOfficerState(saved);
      void refreshAuditLogs();
      notify("Foto do integrante atualizada com sucesso.");
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Falha ao enviar a foto.",
        "error"
      );
    } finally {
      setSavingOfficerPhotoId(null);
    }
  }

  function handleRemoveOfficerPhoto(officer: Officer) {
    setConfirmation({
      title: "Remover foto do integrante",
      message: `A foto de ${officer.name} será removida da ficha do efetivo.`,
      confirmLabel: "Remover foto",
      requiredText: "REMOVER",
      onConfirm: async () => {
        setSavingOfficerPhotoId(officer.id);
        try {
          const saved = await removeOfficerPhoto(officer);
          replaceOfficerState(saved);
          void refreshAuditLogs();
          notify("Foto removida com sucesso.");
        } catch (cause) {
          notify(
            cause instanceof Error ? cause.message : "Falha ao remover a foto.",
            "error"
          );
        } finally {
          setSavingOfficerPhotoId(null);
        }
      }
    });
  }

  async function handleSaveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canOperate) {
      notify("Seu nível de acesso é somente consulta.", "error");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const officerId = String(form.get("officerId") ?? "");
    const prisons = Number(form.get("prisons") ?? 0);
    const pursuits = Number(form.get("pursuits") ?? 0);
    const note = String(form.get("note") ?? "").trim();

    if (!officerId) {
      notify("Selecione um integrante.", "error");
      return;
    }

    if (prisons < 0 || pursuits < 0) {
      notify("Os valores não podem ser negativos.", "error");
      return;
    }

    try {
      const saved = await saveEntry({
        id: createId("entry"),
        officerId,
        year,
        month,
        week,
        prisons,
        pursuits,
        note
      });

      setEntries((current) => {
        const index = current.findIndex(
          (item) =>
            item.officerId === saved.officerId &&
            item.year === saved.year &&
            item.month === saved.month &&
            item.week === saved.week
        );

        if (index < 0) return [saved, ...current];

        const next = [...current];
        next[index] = saved;
        return next;
      });

      formElement.reset();
      void refreshAuditLogs();
      notify("Lançamento salvo com sucesso.");
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Falha ao salvar lançamento.",
        "error"
      );
    }
  }

  function handleDeleteEntry(id: string) {
    if (!canOperate) {
      notify("Seu nível de acesso é somente consulta.", "error");
      return;
    }

    const entry = entries.find((item) => item.id === id);
    const officer = officers.find((item) => item.id === entry?.officerId);

    setConfirmation({
      title: "Excluir lançamento",
      message: `Esta ação removerá o lançamento de ${officer?.name ?? "integrante"} e ficará registrada na auditoria.`,
      confirmLabel: "Excluir definitivamente",
      requiredText: "EXCLUIR",
      onConfirm: async () => {
        try {
          await deleteEntry(id);
          setEntries((current) => current.filter((item) => item.id !== id));
          void refreshAuditLogs();
          notify("Lançamento excluído e registrado na auditoria.");
        } catch (cause) {
          notify(
            cause instanceof Error
              ? cause.message
              : "Falha ao excluir lançamento.",
            "error"
          );
        }
      }
    });
  }

  async function handleSaveDiscordRecord(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (!canOperate) {
      notify("Seu nível de acesso é somente consulta.", "error");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const officerId = String(form.get("officerId") ?? "");
    const activityType = String(
      form.get("activityType") ?? ""
    ) as DiscordActivityType;
    const quantity = Number(form.get("quantity") ?? 1);
    const discordUrl = String(form.get("discordUrl") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();

    if (!officerId) {
      notify("Selecione um integrante.", "error");
      return;
    }

    if (!activityType) {
      notify("Selecione o tipo do registro.", "error");
      return;
    }

    try {
      const result = await saveDiscordRecord({
        officerId,
        year,
        month,
        week,
        activityType,
        quantity,
        discordUrl,
        note
      });

      setDiscordRecords((current) => [result.record, ...current]);

      formElement.reset();
      void refreshAuditLogs();
      notify("Registro enviado para aprovação da supervisão.");
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Falha ao salvar registro do Discord.",
        "error"
      );
    }
  }


  function updateDiscordBatchRow(
    id: string,
    field: keyof Omit<DiscordBatchDraft, "id">,
    value: string | number
  ) {
    setDiscordBatchRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  }

  function addDiscordBatchRow() {
    setDiscordBatchRows((current) => [
      ...current,
      createBatchDraft()
    ]);
  }

  function removeDiscordBatchRow(id: string) {
    setDiscordBatchRows((current) => {
      const next = current.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createBatchDraft()];
    });
  }

  function clearDiscordBatch() {
    setDiscordBatchRows(createInitialBatchRows());
  }

  async function handleSaveDiscordBatch() {
    if (!canOperate) {
      notify("Seu nível de acesso é somente consulta.", "error");
      return;
    }

    if (activeDiscordBatchRows.length === 0) {
      notify("Preencha pelo menos uma linha do lote.", "error");
      return;
    }

    if (discordBatchValidation.hasErrors) {
      notify("Corrija as linhas destacadas antes de salvar.", "error");
      return;
    }

    const validationByRow = new Map(
      discordBatchValidation.rows.map((row) => [row.rowId, row])
    );

    const inputs: DiscordRecordInput[] = activeDiscordBatchRows.map(
      (row) => ({
        officerId: row.officerId,
        year,
        month,
        week,
        activityType: row.activityType,
        quantity: row.quantity,
        discordUrl:
          validationByRow.get(row.id)?.normalizedUrl ?? row.discordUrl,
        note: row.note.trim()
      })
    );

    setSavingDiscordBatch(true);

    try {
      const results = await saveDiscordRecordsBatch(inputs);

      setDiscordRecords((current) => [
        ...results.map((result) => result.record),
        ...current
      ]);

      clearDiscordBatch();
      void refreshAuditLogs();
      notify(
        `${results.length} registro(s) enviado(s) para aprovação.`
      );
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Falha ao salvar o lote do Discord.",
        "error"
      );
    } finally {
      setSavingDiscordBatch(false);
    }
  }

  function handleDeleteDiscordRecord(id: string) {
    if (!canOperate) {
      notify("Seu nível de acesso é somente consulta.", "error");
      return;
    }

    const record = discordRecords.find((item) => item.id === id);
    const approved = record?.status === "Aprovado";
    const message = approved
      ? "A comprovação aprovada será excluída e a quantidade será descontada do total semanal. A ação ficará registrada na auditoria."
      : "A comprovação será excluída e a ação ficará registrada na auditoria.";

    setConfirmation({
      title: approved ? "Excluir comprovação aprovada" : "Excluir comprovação",
      message,
      confirmLabel: approved ? "Excluir e descontar" : "Excluir definitivamente",
      requiredText: "EXCLUIR",
      onConfirm: async () => {
        try {
          const result = await deleteDiscordRecord(id);
          setDiscordRecords((current) =>
            current.filter((item) => item.id !== id)
          );

          if (result.entry) {
            setEntries((current) => {
              const index = current.findIndex(
                (item) =>
                  item.officerId === result.entry!.officerId &&
                  item.year === result.entry!.year &&
                  item.month === result.entry!.month &&
                  item.week === result.entry!.week
              );

              if (index < 0) return current;
              const next = [...current];
              next[index] = result.entry!;
              return next;
            });
          }

          void refreshAuditLogs();
          notify(
            result.entry
              ? "Registro removido e total semanal atualizado."
              : "Registro removido com sucesso."
          );
        } catch (cause) {
          notify(
            cause instanceof Error
              ? cause.message
              : "Falha ao excluir registro do Discord.",
            "error"
          );
        }
      }
    });
  }

  async function handleReviewDiscordRecord(
    id: string,
    decision: "Aprovar" | "Rejeitar"
  ) {
    if (!canReview) {
      notify("Seu nível de acesso não permite analisar registros.", "error");
      return;
    }

    let reason = "";
    if (decision === "Rejeitar") {
      reason = window.prompt("Informe o motivo da rejeição:")?.trim() ?? "";
      if (!reason) return;
    }

    try {
      const result = await reviewDiscordRecord(id, decision, reason);
      setDiscordRecords((current) =>
        current.map((item) => (item.id === id ? result.record : item))
      );

      if (result.entry) {
        setEntries((current) => {
          const index = current.findIndex(
            (item) =>
              item.officerId === result.entry!.officerId &&
              item.year === result.entry!.year &&
              item.month === result.entry!.month &&
              item.week === result.entry!.week
          );
          if (index < 0) return [result.entry!, ...current];
          const next = [...current];
          next[index] = result.entry!;
          return next;
        });
      }

      notify(
        decision === "Aprovar"
          ? "Registro aprovado e contabilizado."
          : "Registro rejeitado."
      );
      void refreshAuditLogs();
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Falha ao analisar registro.",
        "error"
      );
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) {
      notify("Somente o administrador pode gerenciar acessos.", "error");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const displayName = String(form.get("displayName") ?? "").trim();
    const role = String(form.get("role") ?? "Consulta") as AppRole;

    if (!email) {
      notify("Informe o e-mail do usuário.", "error");
      return;
    }

    try {
      const member = await addGamMember({ email, displayName, role });
      setMembers((current) => {
        const index = current.findIndex((item) => item.userId === member.userId);
        if (index < 0) return [...current, member];
        const next = [...current];
        next[index] = member;
        return next;
      });
      formElement.reset();
      void refreshAuditLogs();
      notify("Acesso vinculado com sucesso.");
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Falha ao vincular usuário.",
        "error"
      );
    }
  }

  async function handleAddMemberInput(input: {
    email: string;
    displayName: string;
    role: AppRole;
  }) {
    if (!isAdmin) {
      notify(
        "Somente o administrador pode gerenciar acessos.",
        "error"
      );
      return;
    }

    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();

    if (!email) {
      notify("Informe o e-mail do usuário.", "error");
      return;
    }

    try {
      const member = await addGamMember({
        email,
        displayName,
        role: input.role
      });

      setMembers((current) => {
        const index = current.findIndex(
          (item) => item.userId === member.userId
        );

        if (index < 0) {
          return [...current, member];
        }

        const next = [...current];
        next[index] = member;
        return next;
      });

      void refreshAuditLogs();
      notify("Acesso vinculado com sucesso.");
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Falha ao vincular usuário.",
        "error"
      );
    }
  }

  async function handleApproveRequest(
    userId: string,
    role: AppRole
  ) {
    if (!isAdmin) {
      notify(
        "Somente o administrador pode aprovar acessos.",
        "error"
      );
      return;
    }

    try {
      const saved = await approveGamMember(
        userId,
        role
      );

      setMembers((current) =>
        current.map((member) =>
          member.userId === saved.userId
            ? saved
            : member
        )
      );

      void refreshAuditLogs();

      notify(
        `${saved.displayName} foi aprovado como ${saved.role}.`
      );
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Falha ao aprovar a solicitação.",
        "error"
      );

      throw cause;
    }
  }

  async function handleRejectRequest(
    userId: string,
    reason: string
  ) {
    if (!isAdmin) {
      notify(
        "Somente o administrador pode rejeitar acessos.",
        "error"
      );
      return;
    }

    try {
      const saved = await rejectGamMember(
        userId,
        reason
      );

      setMembers((current) =>
        current.map((member) =>
          member.userId === saved.userId
            ? saved
            : member
        )
      );

      void refreshAuditLogs();

      notify(
        `A solicitação de ${saved.displayName} foi rejeitada.`
      );
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "Falha ao rejeitar a solicitação.",
        "error"
      );

      throw cause;
    }
  }

  async function handleUpdateMember(member: GamMember) {
    if (!isAdmin) return;
    try {
      const saved = await updateGamMember({
        userId: member.userId,
        displayName: member.displayName,
        role: member.role,
        active: member.active
      });
      setMembers((current) =>
        current.map((item) => (item.userId === saved.userId ? saved : item))
      );
      if (saved.userId === access?.userId) {
        setAccess((current) =>
          current
            ? {
                ...current,
                displayName: saved.displayName,
                role: saved.role,
                active: saved.active
              }
            : current
        );
      }
      void refreshAuditLogs();
      notify("Permissões atualizadas.");
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Falha ao atualizar acesso.",
        "error"
      );
    }
  }

  function handleCloseMonth() {
    if (!canClose) {
      notify("Somente o administrador pode fechar o mês.", "error");
      return;
    }

    setConfirmation({
      title: "Confirmar fechamento mensal",
      message: `${MONTHS[month - 1]} de ${year} será arquivado com hash de integridade. Um novo fechamento do mesmo período substituirá o arquivo anterior.`,
      confirmLabel: "Fechar e arquivar",
      requiredText: "FECHAR",
      onConfirm: async () => {
        try {
          const closure = await closeMonth(year, month, officers, entries);
          setClosures((current) => [
            closure,
            ...current.filter(
              (item) => !(item.year === year && item.month === month)
            )
          ]);
          void refreshAuditLogs();
          notify("Mês fechado e arquivado com sucesso.");
        } catch (cause) {
          notify(
            cause instanceof Error ? cause.message : "Falha ao fechar o mês.",
            "error"
          );
        }
      }
    });
  }

  function handleExportAuditCsv(logsToExport: AuditLog[]) {
    if (!canAudit) {
      notify("Seu nível de acesso não permite exportar auditoria.", "error");
      return;
    }

    const header = [
      "Data e hora",
      "Usuário",
      "Ação",
      "Módulo",
      "Alvo",
      "Resumo",
      "ID"
    ];
    const rows = logsToExport.map((log) => {
      const actor = members.find((item) => item.userId === log.actorUserId);
      return [
        formatDateTime(log.createdAt),
        actor?.displayName ?? "Sistema / usuário removido",
        auditActionLabel(log),
        auditModuleLabel(log.entity),
        auditTargetLabel(log, officers),
        auditSummary(log),
        log.entityId
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(";"))
      .join("\n");
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(
      `gam-auditoria-${date}.csv`,
      `\uFEFF${csv}`,
      "text/csv;charset=utf-8"
    );
    notify(`${logsToExport.length} registro(s) exportado(s) para CSV.`);
  }

  function handleBackup() {
    if (!isAdmin) {
      notify("Somente o administrador pode gerar o backup completo.", "error");
      return;
    }

    const generatedAt = new Date().toISOString();
    const payload = {
      product: "GAM Analytics Web",
      version: "0.7",
      generatedAt,
      generatedBy: {
        userId: access.userId,
        email: access.email,
        displayName: access.displayName,
        role: access.role
      },
      data: {
        officers,
        entries,
        discordRecords,
        closures,
        members,
        auditLogs,
        notificationReads
      }
    };
    downloadFile(
      `gam-backup-${generatedAt.slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8"
    );
    notify("Backup completo gerado com sucesso.");
  }


  if (!sessionReady) {
    return <div className="full-loader">Carregando GAM Analytics...</div>;
  }

  if (!access) {
    return (
      <LoginScreen
        onAuthenticated={(authenticatedAccess) => {
          setLoading(true);
          setAccess(authenticatedAccess);
        }}
      />
    );
  }

  const totalPrisons = metrics.reduce(
    (total, officer) => total + officer.prisons,
    0
  );
  const totalPursuits = metrics.reduce(
    (total, officer) => total + officer.pursuits,
    0
  );
  const metGoals = metrics.filter(
    (officer) => officer.situation === "META ATINGIDA"
  ).length;
  const noEntries = metrics.filter(
    (officer) => officer.situation === "SEM REGISTRO"
  ).length;
  const pendingDiscord = discordPeriodRecords.filter(
    (record) => record.status === "Pendente"
  ).length;
  const approvedDiscord = discordPeriodRecords.filter(
    (record) => record.status === "Aprovado"
  ).length;
  const rejectedDiscord = discordPeriodRecords.filter(
    (record) => record.status === "Rejeitado"
  ).length;

  const periodEntries = entries.filter(
    (entry) =>
      entry.year === year && entry.month === month && entry.week === week
  );

  const pageTitle = PAGE_META[screen];

  return (
    <div className="app-shell">
      <button
        className={`mobile-overlay ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-label="Fechar menu"
      />

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="side-brand">
          <Image
            className="side-brand-icon"
            src="/icon.svg"
            alt=""
            aria-hidden="true"
            width={512}
            height={512}
          />
          <div>
            <strong>GAM Analytics</strong>
            <span>Centro Operacional • V0.8.5.2</span>
          </div>
        </div>

        <nav className="nav">
          {(
            [
              ["dashboard", "⌂", "Centro Operacional", true],
              ["efetivo", "♙", "Efetivo", canOperate],
              ["discord", "⬡", "Operações", canOperate],
              ["inteligencia", "⌁", "Inteligência", true],
              ["relatorio", "▤", "Relatórios", true],
              ["auditoria", "◉", "Auditoria", canAudit],
              ["acessos", "⚙", "Administração", isAdmin]
            ] as [Screen, string, string, boolean][]
          )
            .filter(([, , , visible]) => visible)
            .map(([key, icon, label]) => (
              <button
                type="button"
                key={key}
                className={screen === key ? "active" : ""}
                onClick={() => {
                  setScreen(key);
                  setMenuOpen(false);
                }}
              >
                <span className="icon">{icon}</span>
                <span className="nav-label">{label}</span>
                {key === "notificacoes" && unreadNotifications.length > 0 && (
                  <span className="nav-count">
                    {unreadNotifications.length > 99
                      ? "99+"
                      : unreadNotifications.length}
                  </span>
                )}
              </button>
            ))}
        </nav>

        <div className="sidebar-system" aria-label="Status do sistema">
          <span>SISTEMA</span>
          <div><i />Supabase <small>Online</small></div>
          <div><i />GAM Sync <small>Online</small></div>
          <div><i className="development" />Discord Bot <small>Em desenvolvimento</small></div>
        </div>

        <div className="sidebar-footer">
          <strong>G.A.M. | OÁSIS RP</strong>
          <br />
          {isDemoMode ? "Modo local" : "Banco Supabase ativo"}
          <br />
          {access.role}
        </div>
      </aside>

      <main className="main">
        <header className={`topbar ${screen === "dashboard" ? "dashboard-topbar" : ""}`}>
          <div className="top-left">
            <button
              className="menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              ☰
            </button>
            <div>
              <h1>{pageTitle[0]}</h1>
              <p>{pageTitle[1]}</p>
            </div>
          </div>

          <div className="userbox">
            <div
              className="gam-period-status"
              title="Período e sincronização ativos"
            >
              <strong>
                {MONTHS[month - 1]} • Semana {week}
              </strong>
              <span>
                {sync.syncing
                  ? "Atualizando dados..."
                  : sync.lastSyncAt
                    ? `Atualizado às ${new Intl.DateTimeFormat(
                        "pt-BR",
                        {
                          hour: "2-digit",
                          minute: "2-digit"
                        }
                      ).format(new Date(sync.lastSyncAt))}`
                    : "Sincronizando..."}
              </span>
            </div>

            <button
              type="button"
              className={`notification-bell ${
                unreadNotifications.length > 0 ? "has-unread" : ""
              }`}
              onClick={() => setScreen("notificacoes")}
              aria-label={`${unreadNotifications.length} notificação(ões) não lida(s)`}
              title="Abrir notificações"
            >
              <span aria-hidden="true">♢</span>
              {unreadNotifications.length > 0 && (
                <b>
                  {unreadNotifications.length > 99
                    ? "99+"
                    : unreadNotifications.length}
                </b>
              )}
            </button>
            <div className="avatar">
              {access.displayName
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase() || "GA"}
            </div>
            <div className="user-name">
              <strong>{access.displayName}</strong>
              <span>{access.role}</span>
            </div>
            <button className="btn ghost" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <div className={`content ${screen === "dashboard" ? "dashboard-content" : ""}`}>
          {loading ? (
            <div className="full-loader contained">Carregando dados...</div>
          ) : (
            <>
              {screen === "dashboard" && (
                <OperationalCenter
                  metrics={metrics}
                  officers={officers}
                  entries={entries}
                  discordRecords={discordRecords}
                  activeCount={activeOfficers.length}
                  totalPrisons={totalPrisons}
                  totalPursuits={totalPursuits}
                  metGoals={metGoals}
                  noEntries={noEntries}
                  month={month}
                  week={week}
                  onMonthChange={setMonth}
                  onWeekChange={setWeek}
                />
              )}

              {screen === "notificacoes" && (
                <NotificationCenter
                  notifications={filteredNotifications}
                  allNotifications={operationalNotifications}
                  month={month}
                  week={week}
                  onMonth={setMonth}
                  onWeek={setWeek}
                  statusFilter={notificationStatusFilter}
                  severityFilter={notificationSeverityFilter}
                  categoryFilter={notificationCategoryFilter}
                  search={notificationSearch}
                  onStatusFilter={setNotificationStatusFilter}
                  onSeverityFilter={setNotificationSeverityFilter}
                  onCategoryFilter={setNotificationCategoryFilter}
                  onSearch={setNotificationSearch}
                  onToggleRead={handleSetNotificationRead}
                  onOpen={handleOpenNotification}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                  onRefresh={handleRefreshNotifications}
                  refreshing={refreshingNotifications}
                />
              )}

              {screen === "efetivo" && (
                <section className="page">
                  {editingOfficer && (
                    <Card
                      title={
                        editingOfficer.id
                          ? "Editar integrante"
                          : "Novo integrante"
                      }
                      className="margin-bottom"
                    >
                      <form
                        key={editingOfficer.id || "novo-integrante"}
                        className="form-grid officer-form"
                        onSubmit={handleSaveOfficer}
                      >
                        <label className="field">
                          <span>Matrícula</span>
                          <input
                            name="registration"
                            defaultValue={editingOfficer.registration}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>QRA / Nome</span>
                          <input
                            name="name"
                            defaultValue={editingOfficer.name}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Cargo</span>
                          <select
                            name="role"
                            defaultValue={editingOfficer.role}
                          >
                            <option>Estagiário</option>
                            <option>Oficial GAM</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Guarnição</span>
                          <select
                            name="garrison"
                            defaultValue={editingOfficer.garrison ?? "Militar"}
                          >
                            <option>Militar</option>
                            <option>Civil</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Status</span>
                          <select
                            name="status"
                            defaultValue={editingOfficer.status}
                          >
                            <option>Ativo</option>
                            <option>Inativo</option>
                          </select>
                        </label>
                        <label className="field full">
                          <span>ID do Discord (opcional)</span>
                          <input
                            name="discordUrl"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{10,25}"
                            placeholder="Ex.: 123456789012345678"
                            defaultValue={editingOfficer.discordUrl ?? ""}
                            autoComplete="off"
                          />
                        </label>
                        <div className="form-actions full">
                          <button className="btn" type="submit">
                            Salvar integrante
                          </button>
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => setEditingOfficer(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </Card>
                  )}

                  <OfficersModule
                    metrics={effectiveMetrics}
                    officers={officers}
                    month={month}
                    week={week}
                    canOperate={canOperate}
                    onMonthChange={setMonth}
                    onWeekChange={setWeek}
                    onNewOfficer={() =>
                      setEditingOfficer({
                        id: "",
                        registration: "",
                        name: "",
                        role: "Estagiário",
                        garrison: "Militar",
                        status: "Ativo",
                        prisonGoal: 6,
                        pursuitGoal: 12,
                        discordUrl: ""
                      })
                    }
                    onEditOfficer={setEditingOfficer}
                    onOpenProfile={setProfileOfficerId}
                  />
                </section>
              )}

              {screen === "lancamentos" && (
                <section className="page">
                  <PageHeader
                    title="Novo lançamento"
                    description="Registre as atividades semanais do efetivo."
                  >
                    <Selectors
                      month={month}
                      week={week}
                      onMonth={setMonth}
                      onWeek={setWeek}
                    />
                  </PageHeader>

                  <div className="grid two">
                    <Card
                      title="Dados do lançamento"
                      subtitle="Um registro por integrante e semana"
                    >
                      <form
                        className="form-grid"
                        onSubmit={handleSaveEntry}
                      >
                        <label className="field full">
                          <span>Integrante</span>
                          <select name="officerId" required>
                            <option value="">Selecione</option>
                            {activeOfficers.map((officer) => (
                              <option key={officer.id} value={officer.id}>
                                {officer.registration} — {officer.name} (
                                {officer.role})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Prisões</span>
                          <input
                            name="prisons"
                            type="number"
                            min={0}
                            defaultValue={0}
                            required
                          />
                        </label>
                        <label className="field">
                          <span>Acompanhamentos</span>
                          <input
                            name="pursuits"
                            type="number"
                            min={0}
                            defaultValue={0}
                            required
                          />
                        </label>
                        <label className="field full">
                          <span>Observação</span>
                          <textarea
                            name="note"
                            rows={4}
                            placeholder="Observação opcional"
                          />
                        </label>
                        <div className="form-actions full">
                          <button className="btn" type="submit">
                            Salvar lançamento
                          </button>
                          <button className="btn secondary" type="reset">
                            Limpar
                          </button>
                        </div>
                      </form>
                    </Card>

                    <Card title="Validações" subtitle="Aplicadas automaticamente">
                      <div className="alert-list">
                        <InfoAlert
                          title="Integrante ativo"
                          text="Somente integrantes ativos aparecem para lançamento."
                          badge="OK"
                        />
                        <InfoAlert
                          title="Registro único"
                          text="Repetir mês, semana e integrante atualiza o registro existente."
                          badge="AUTO"
                        />
                        <InfoAlert
                          title="Metas por cargo"
                          text="Oficial GAM e Estagiário possuem metas diferentes."
                          badge="REGRA"
                        />
                        <InfoAlert
                          title="Evite contagem dupla"
                          text="O que entrar em Registro Discord não deve ser digitado novamente nesta tela."
                          badge="ATENÇÃO"
                        />
                        <InfoAlert
                          title={isDemoMode ? "Salvamento local" : "Banco online"}
                          text={
                            isDemoMode
                              ? "Os dados ficam neste navegador até o Supabase ser conectado."
                              : "Os dados são gravados no Supabase com controle de acesso."
                          }
                          badge={isDemoMode ? "DEMO" : "ONLINE"}
                        />
                      </div>
                    </Card>
                  </div>

                  <Card
                    title="Lançamentos registrados"
                    subtitle={`${periodEntries.length} registro(s) no período`}
                    className="margin-top"
                  >
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Integrante</th>
                            <th>Prisões</th>
                            <th>Acompanhamentos</th>
                            <th>Observação</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {periodEntries.map((entry) => {
                            const officer = officers.find(
                              (item) => item.id === entry.officerId
                            );

                            return (
                              <tr key={entry.id}>
                                <td>
                                  <strong>{officer?.name ?? "Integrante"}</strong>
                                  <br />
                                  <span className="muted small">
                                    {officer?.registration}
                                  </span>
                                </td>
                                <td>{entry.prisons}</td>
                                <td>{entry.pursuits}</td>
                                <td>{entry.note || "—"}</td>
                                <td>
                                  <button
                                    className="table-action danger"
                                    onClick={() =>
                                      handleDeleteEntry(entry.id)
                                    }
                                  >
                                    Excluir
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </section>
              )}

              {screen === "discord" && (
                <>
                  <OperationsModule
                    records={discordRecords}
                    officers={officers}
                    month={month}
                    week={week}
                    onMonthChange={setMonth}
                    onWeekChange={setWeek}
                  />

                  <GamSyncPanel
                    officers={officers}
                    entries={entries}
                    year={year}
                    month={month}
                    week={week}
                    onProcessed={(savedEntry) => {
                      setEntries((current) => {
                        const index = current.findIndex(
                          (item) =>
                            item.officerId === savedEntry.officerId &&
                            item.year === savedEntry.year &&
                            item.month === savedEntry.month &&
                            item.week === savedEntry.week
                        );

                        if (index < 0) {
                          return [savedEntry, ...current];
                        }

                        const next = [...current];
                        next[index] = savedEntry;
                        return next;
                      });

                      void refreshAuditLogs();
                      notify("Mensagem processada pelo GAM Sync.");
                    }}
                  />
                </>
              )}

              {screen === "inteligencia" && (
                <section className="page">
                  <PageHeader
                    title="Inteligência Operacional"
                    description="Alertas, evolução e prioridades da supervisão."
                  >
                    <Selectors
                      month={month}
                      week={week}
                      onMonth={setMonth}
                      onWeek={setWeek}
                    />
                  </PageHeader>

                  <Intelligence
                    metrics={metrics}
                    previousMetrics={previousMetrics}
                    week={week}
                  />
                </section>
              )}

              {screen === "relatorio" && (
                <ReportsModule
                  metrics={metrics}
                  officers={officers}
                  entries={entries}
                  discordRecords={discordRecords}
                  year={year}
                  month={month}
                  week={week}
                  onMonthChange={setMonth}
                  onWeekChange={setWeek}
                />
              )}

              {screen === "fechamento" && (
                <section className="page">
                  <PageHeader
                    title="Fechamento Mensal"
                    description="Conferência final antes de arquivar o período."
                  >
                    <Selectors
                      month={month}
                      week={week}
                      onMonth={setMonth}
                      onWeek={setWeek}
                      hideWeek
                    />
                  </PageHeader>

                  <Closing
                    year={year}
                    month={month}
                    officers={activeOfficers}
                    entries={entries}
                    closures={closures}
                    onClose={handleCloseMonth}
                  />
                </section>
              )}

              {screen === "auditoria" && canAudit && (
                <AuditModule
                  logs={auditLogs}
                  officers={officers}
                  members={members}
                />
              )}

              {screen === "acessos" && isAdmin && (
                <AdminModule
                  access={access}
                  members={members}
                  onAddMember={handleAddMemberInput}
                  onUpdateMember={handleUpdateMember}
                  onApproveRequest={handleApproveRequest}
                  onRejectRequest={handleRejectRequest}
                  onBackup={handleBackup}
                />
              )}
            </>
          )}
        </div>
      </main>

      {profileOfficer && profileMetric && (
        <OfficerProfileModal
          officer={profileOfficer}
          metric={profileMetric}
          month={month}
          week={week}
          canEdit={canOperate}
          canManagePhoto={isAdmin}
          savingPhoto={savingOfficerPhotoId === profileOfficer.id}
          onClose={() => setProfileOfficerId(null)}
          onEdit={() => {
            setEditingOfficer(profileOfficer);
            setProfileOfficerId(null);
          }}
          onUploadPhoto={(file) => handleUploadOfficerPhoto(profileOfficer, file)}
          onRemovePhoto={() => handleRemoveOfficerPhoto(profileOfficer)}
        />
      )}

      {selectedAuditLog && (
        <AuditDetailModal
          log={selectedAuditLog}
          members={members}
          officers={officers}
          onClose={() => setSelectedAuditLog(null)}
        />
      )}

      {confirmation && (
        <ConfirmationDialog
          request={confirmation}
          onClose={() => setConfirmation(null)}
        />
      )}

      {toast && (
        <div className={`toast show ${toast.kind}`}>{toast.message}</div>
      )}
    </div>
  );
}

function officerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GAM";
}

function OfficerAvatar({
  officer,
  size = "medium"
}: {
  officer: Officer;
  size?: "medium" | "large" | "profile";
}) {
  return (
    <div className={`officer-avatar ${size}`}>
      {officer.photoUrl ? (
        <Image
          src={officer.photoUrl}
          alt={`Foto de ${officer.name}`}
          width={180}
          height={180}
          unoptimized
        />
      ) : (
        <span>{officerInitials(officer.name)}</span>
      )}
    </div>
  );
}

function OfficerProfileModal({
  officer,
  metric,
  month,
  week,
  canEdit,
  canManagePhoto,
  savingPhoto,
  onClose,
  onEdit,
  onUploadPhoto,
  onRemovePhoto
}: {
  officer: Officer;
  metric: OfficerMetrics;
  month: number;
  week: number;
  canEdit: boolean;
  canManagePhoto: boolean;
  savingPhoto: boolean;
  onClose: () => void;
  onEdit: () => void;
  onUploadPhoto: (file: File) => void;
  onRemovePhoto: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card officer-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${officer.name}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="officer-profile-hero">
          <OfficerAvatar officer={officer} size="profile" />
          <div>
            <span className="officer-registration">{officer.registration}</span>
            <h2>{officer.name}</h2>
            <p>
              {officer.role} • {officer.garrison} • {officer.status}
            </p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="officer-profile-period">
          <span>{MONTHS[month - 1]} de {new Date().getFullYear()}</span>
          <strong>Semana {week}</strong>
        </div>

        <div className="officer-profile-kpis">
          <div><span>Prisões</span><strong>{metric.prisons}<small> / {metric.prisonGoal}</small></strong></div>
          <div><span>Acompanhamentos</span><strong>{metric.pursuits}<small> / {metric.pursuitGoal}</small></strong></div>
          <div><span>Total operacional</span><strong>{metric.total}</strong></div>
          <div><span>Progresso</span><strong>{Math.round(metric.progress * 100)}%</strong></div>
        </div>

        <div className="officer-profile-status">
          <div>
            <span>Situação atual</span>
            <strong>{metric.situation}</strong>
          </div>
          <div>
            <span>Orientação</span>
            <strong>{metric.guidance}</strong>
          </div>
        </div>

        <div className="officer-profile-progress">
          <div className="progress"><span style={{ width: `${Math.round(metric.progress * 100)}%` }} /></div>
        </div>

        <div className="officer-profile-links">
          <div>
            <span>Discord</span>
            {officer.discordUrl ? (
              <a href={officer.discordUrl} target="_blank" rel="noreferrer">Abrir perfil ou referência ↗</a>
            ) : (
              <strong>Não informado</strong>
            )}
          </div>
          <div>
            <span>Identidade visual</span>
            <strong>{officer.photoUrl ? "Foto cadastrada" : "Sem foto"}</strong>
          </div>
        </div>

        {canManagePhoto && (
          <div className="officer-photo-controls">
            <div>
              <strong>Foto do integrante</strong>
              <span>JPG, PNG ou WEBP de até 5 MB.</span>
            </div>
            <div>
              <label className={`btn secondary file-button ${savingPhoto ? "disabled" : ""}`}>
                {savingPhoto ? "Processando..." : officer.photoUrl ? "Trocar foto" : "Enviar foto"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={savingPhoto}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUploadPhoto(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {officer.photoUrl && (
                <button className="btn ghost" type="button" onClick={onRemovePhoto} disabled={savingPhoto}>
                  Remover foto
                </button>
              )}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" type="button" onClick={onClose}>Fechar</button>
          {canEdit && <button className="btn" type="button" onClick={onEdit}>Editar integrante</button>}
        </div>
      </section>
    </div>
  );
}

function PageHeader({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  detail,
  kind = ""
}: {
  label: string;
  value: number | string;
  detail: string;
  kind?: string;
}) {
  return (
    <div className={`card kpi ${kind}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="delta">{detail}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = ""
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      <div className="card-body">
        <div className="card-title">
          <h3>{title}</h3>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

function PerformanceBars({
  metrics
}: {
  metrics: ReturnType<typeof getMetrics>[];
}) {
  const sorted = [...metrics].sort((a, b) => b.total - a.total).slice(0, 8);
  const max = Math.max(1, ...sorted.map((item) => item.total));

  return (
    <div className="bars">
      {sorted.map((item) => (
        <div className="bar-row" key={item.id}>
          <span>{item.name}</span>
          <div className="bar">
            <span style={{ width: `${(item.total / max) * 100}%` }} />
          </div>
          <strong>{item.total}</strong>
        </div>
      ))}
    </div>
  );
}

function InfoAlert({
  title,
  text,
  badge
}: {
  title: string;
  text: string;
  badge: string;
}) {
  return (
    <div className="alert">
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
      <Badge text={badge} />
    </div>
  );
}


function NotificationCenter({
  notifications,
  allNotifications,
  month,
  week,
  onMonth,
  onWeek,
  statusFilter,
  severityFilter,
  categoryFilter,
  search,
  onStatusFilter,
  onSeverityFilter,
  onCategoryFilter,
  onSearch,
  onToggleRead,
  onOpen,
  onMarkAllRead,
  onRefresh,
  refreshing
}: {
  notifications: OperationalNotification[];
  allNotifications: OperationalNotification[];
  month: number;
  week: number;
  onMonth: (value: number) => void;
  onWeek: (value: number) => void;
  statusFilter: string;
  severityFilter: string;
  categoryFilter: string;
  search: string;
  onStatusFilter: (value: string) => void;
  onSeverityFilter: (value: string) => void;
  onCategoryFilter: (value: string) => void;
  onSearch: (value: string) => void;
  onToggleRead: (notificationId: string, read: boolean) => Promise<void>;
  onOpen: (notification: OperationalNotification) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}) {
  const unread = allNotifications.filter((item) => !item.read);
  const critical = allNotifications.filter(
    (item) => item.severity === "critical" && !item.read
  );
  const warnings = allNotifications.filter(
    (item) => item.severity === "warning" && !item.read
  );
  const approvals = allNotifications.filter(
    (item) => item.category === "aprovacao" && !item.read
  );

  return (
    <section className="page notification-page">
      <PageHeader
        title="Central de Notificações"
        description="Pendências, alertas e lembretes calculados com os dados da operação."
      >
        <Selectors
          month={month}
          week={week}
          onMonth={onMonth}
          onWeek={onWeek}
        />
      </PageHeader>

      <div className="kpis notification-kpis">
        <Kpi
          label="NÃO LIDAS"
          value={unread.length}
          detail="Precisam de atenção"
          kind={unread.length > 0 ? "warn" : "good"}
        />
        <Kpi
          label="CRÍTICAS"
          value={critical.length}
          detail="Ação prioritária"
          kind={critical.length > 0 ? "bad" : "good"}
        />
        <Kpi
          label="ATENÇÃO"
          value={warnings.length}
          detail="Acompanhar no período"
          kind={warnings.length > 0 ? "warn" : "good"}
        />
        <Kpi
          label="APROVAÇÕES"
          value={approvals.length}
          detail="Alertas do Discord"
          kind={approvals.length > 0 ? "warn" : "good"}
        />
      </div>

      <div className="card notification-control-card">
        <div className="notification-control-head">
          <div>
            <h3>Filtros e ações</h3>
            <p>As notificações são pessoais: cada usuário controla o que já leu.</p>
          </div>
          <div className="notification-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => void onRefresh()}
              disabled={refreshing}
            >
              {refreshing ? "Atualizando..." : "Atualizar alertas"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void onMarkAllRead()}
              disabled={notifications.every((item) => item.read)}
            >
              Marcar filtradas como lidas
            </button>
          </div>
        </div>

        <div className="notification-filters">
          <label className="field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilter(event.target.value)}
            >
              <option value="nao-lidas">Não lidas</option>
              <option value="todas">Todas</option>
              <option value="lidas">Lidas</option>
            </select>
          </label>
          <label className="field">
            <span>Prioridade</span>
            <select
              value={severityFilter}
              onChange={(event) => onSeverityFilter(event.target.value)}
            >
              <option value="todas">Todas</option>
              <option value="critical">Críticas</option>
              <option value="warning">Atenção</option>
              <option value="info">Informativas</option>
              <option value="success">Tudo certo</option>
            </select>
          </label>
          <label className="field">
            <span>Categoria</span>
            <select
              value={categoryFilter}
              onChange={(event) => onCategoryFilter(event.target.value)}
            >
              <option value="todas">Todas</option>
              <option value="aprovacao">Aprovações</option>
              <option value="registro">Registros</option>
              <option value="meta">Metas</option>
              <option value="fechamento">Fechamento</option>
              <option value="sistema">Sistema</option>
            </select>
          </label>
          <label className="field notification-search-field">
            <span>Busca</span>
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Nome, alerta ou período"
            />
          </label>
        </div>
      </div>

      <div className="notification-layout">
        <div className="notification-list" aria-live="polite">
          {notifications.length === 0 ? (
            <div className="card notification-empty">
              <span>✓</span>
              <h3>Nenhuma notificação neste filtro</h3>
              <p>Altere os filtros ou atualize os dados da operação.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`notification-item ${notification.severity} ${
                  notification.read ? "read" : "unread"
                }`}
              >
                <div className="notification-priority" aria-hidden="true" />
                <div className="notification-symbol" aria-hidden="true">
                  {notification.severity === "critical"
                    ? "!"
                    : notification.severity === "warning"
                      ? "△"
                      : notification.severity === "success"
                        ? "✓"
                        : "i"}
                </div>
                <div className="notification-copy">
                  <div className="notification-meta">
                    <span className={`notification-severity ${notification.severity}`}>
                      {notificationSeverityLabel(notification.severity)}
                    </span>
                    <span>{notificationCategoryLabel(notification.category)}</span>
                    <span>{notification.periodLabel}</span>
                    {!notification.read && <b>Nova</b>}
                  </div>
                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>
                </div>
                <div className="notification-item-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => void onOpen(notification)}
                  >
                    {notification.actionLabel}
                  </button>
                  {notification.severity !== "success" && (
                    <button
                      type="button"
                      className="table-action"
                      onClick={() =>
                        void onToggleRead(notification.id, !notification.read)
                      }
                    >
                      {notification.read ? "Marcar não lida" : "Marcar como lida"}
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="card notification-guide">
          <h3>Leitura rápida</h3>
          <div className="notification-guide-row critical">
            <span>!</span>
            <div>
              <strong>Crítica</strong>
              <p>Sem registro, grande fila de aprovação ou fechamento urgente.</p>
            </div>
          </div>
          <div className="notification-guide-row warning">
            <span>△</span>
            <div>
              <strong>Atenção</strong>
              <p>Meta abaixo do esperado ou ocorrência que precisa de revisão.</p>
            </div>
          </div>
          <div className="notification-guide-row info">
            <span>i</span>
            <div>
              <strong>Informativa</strong>
              <p>Lembretes que ajudam a manter a rotina operacional em dia.</p>
            </div>
          </div>
          <div className="notification-guide-note">
            <strong>Atualização automática</strong>
            <p>
              Ao cadastrar, aprovar ou excluir dados, os alertas são recalculados
              imediatamente. O botão de atualização busca novamente o banco.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function DiscordRecordsTable({
  title = "Comprovações registradas",
  subtitle,
  records,
  officers,
  members,
  onDelete,
  onReview,
  canReview,
  isAdmin,
  totalInPeriod
}: {
  title?: string;
  subtitle?: string;
  records: DiscordRecord[];
  officers: Officer[];
  members: GamMember[];
  onDelete: (id: string) => void;
  onReview: (id: string, decision: "Aprovar" | "Rejeitar") => void;
  canReview: boolean;
  isAdmin: boolean;
  totalInPeriod?: number;
}) {
  const sorted = [...records].sort((a, b) =>
    String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
  );

  const automaticSubtitle =
    totalInPeriod === undefined || totalInPeriod === records.length
      ? `${records.length} registro(s) no período`
      : `${records.length} de ${totalInPeriod} registro(s)`;

  return (
    <Card
      title={title}
      subtitle={subtitle ?? automaticSubtitle}
      className="margin-top"
    >
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Integrante</th>
              <th>Tipo</th>
              <th>Qtd.</th>
              <th>Status</th>
              <th>Comprovação</th>
              <th>Enviado por</th>
              <th>Observação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  Nenhuma comprovação do Discord nesta semana.
                </td>
              </tr>
            ) : (
              sorted.map((record) => {
                const officer = officers.find(
                  (item) => item.id === record.officerId
                );
                const submitter = members.find(
                  (item) => item.userId === record.submittedBy
                );
                const reviewer = members.find(
                  (item) => item.userId === record.reviewedBy
                );
                const canDelete = record.status !== "Aprovado" || isAdmin;

                return (
                  <tr key={record.id}>
                    <td>
                      <strong>{officer?.name ?? "Integrante"}</strong>
                      <br />
                      <span className="muted small">
                        {officer?.registration ?? "—"}
                      </span>
                    </td>
                    <td><Badge text={record.activityType} /></td>
                    <td>{record.quantity}</td>
                    <td>
                      <Badge text={record.status} />
                      {reviewer && record.reviewedAt && (
                        <div className="muted tiny approval-reviewer">
                          por {reviewer.displayName}
                        </div>
                      )}
                    </td>
                    <td>
                      <a
                        className="table-action discord-link"
                        href={record.discordUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir Discord ↗
                      </a>
                    </td>
                    <td>{submitter?.displayName ?? "Usuário GAM"}</td>
                    <td>
                      {record.note || "—"}
                      {record.status === "Rejeitado" && record.rejectionReason && (
                        <div className="rejection-reason">
                          Motivo: {record.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="table-actions-group">
                        {record.status === "Pendente" && canReview && (
                          <>
                            <button
                              className="table-action approve"
                              onClick={() => onReview(record.id, "Aprovar")}
                            >
                              Aprovar
                            </button>
                            <button
                              className="table-action reject"
                              onClick={() => onReview(record.id, "Rejeitar")}
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            className="table-action danger"
                            onClick={() => onDelete(record.id)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AccessManagement({
  members,
  currentUserId,
  onAdd,
  onChange,
  onSave
}: {
  members: GamMember[];
  currentUserId: string;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (
    userId: string,
    changes: Partial<Pick<GamMember, "displayName" | "role" | "active">>
  ) => void;
  onSave: (member: GamMember) => void;
}) {
  return (
    <>
      <div className="grid two">
        <Card title="Vincular novo usuário" subtitle="Conta já criada no Supabase">
          <form className="form-grid" onSubmit={onAdd}>
            <label className="field full">
              <span>E-mail do usuário</span>
              <input name="email" type="email" placeholder="supervisor@email.com" required />
            </label>
            <label className="field">
              <span>Nome exibido</span>
              <input name="displayName" placeholder="Nome do supervisor" />
            </label>
            <label className="field">
              <span>Nível de acesso</span>
              <select name="role" defaultValue="Supervisor">
                <option>Administrador</option>
                <option>Supervisor</option>
                <option>Consulta</option>
              </select>
            </label>
            <div className="form-actions full">
              <button className="btn" type="submit">Vincular acesso</button>
            </div>
          </form>
        </Card>

        <Card title="Como adicionar" subtitle="Fluxo seguro em duas etapas">
          <div className="alert-list">
            <InfoAlert
              title="1. Crie o usuário no Supabase"
              text="Em Authentication > Users, use Add user e defina e-mail e senha."
              badge="CONTA"
            />
            <InfoAlert
              title="2. Vincule nesta tela"
              text="Informe o mesmo e-mail e escolha Administrador, Supervisor ou Consulta."
              badge="ACESSO"
            />
            <InfoAlert
              title="3. Login individual"
              text="Cada pessoa entra com sua própria conta. Nenhuma senha é compartilhada."
              badge="SEGURO"
            />
          </div>
        </Card>
      </div>

      <Card
        title="Usuários da unidade"
        subtitle={`${members.filter((member) => member.active).length} ativo(s)`}
        className="margin-top"
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Permissão</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const principal = member.userId === currentUserId;
                return (
                  <tr key={member.userId}>
                    <td>
                      <input
                        className="inline-access-input"
                        value={member.displayName}
                        onChange={(event) =>
                          onChange(member.userId, { displayName: event.target.value })
                        }
                      />
                      {principal && <span className="muted tiny">Administrador principal</span>}
                    </td>
                    <td>{member.email}</td>
                    <td>
                      <select
                        value={member.role}
                        disabled={principal}
                        onChange={(event) =>
                          onChange(member.userId, { role: event.target.value as AppRole })
                        }
                      >
                        <option>Administrador</option>
                        <option>Supervisor</option>
                        <option>Consulta</option>
                      </select>
                    </td>
                    <td>
                      <label className="access-toggle">
                        <input
                          type="checkbox"
                          checked={member.active}
                          disabled={principal}
                          onChange={(event) =>
                            onChange(member.userId, { active: event.target.checked })
                          }
                        />
                        <Badge text={member.active ? "Ativo" : "Inativo"} />
                      </label>
                    </td>
                    <td>
                      <button
                        className="table-action"
                        type="button"
                        onClick={() => onSave(member)}
                      >
                        Salvar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}


function AuditActivityList({
  logs,
  members,
  officers,
  limit,
  onInspect
}: {
  logs: AuditLog[];
  members: GamMember[];
  officers: Officer[];
  limit?: number;
  onInspect: (log: AuditLog) => void;
}) {
  const visibleLogs = typeof limit === "number" ? logs.slice(0, limit) : logs;

  if (visibleLogs.length === 0) {
    return <div className="empty">Nenhuma atividade registrada ainda.</div>;
  }

  return (
    <div className="audit-activity-list">
      {visibleLogs.map((log) => {
        const actor = members.find((item) => item.userId === log.actorUserId);
        return (
          <button
            className="audit-activity"
            type="button"
            key={log.id}
            onClick={() => onInspect(log)}
          >
            <span className={`audit-action ${auditActionClass(log)}`}>
              {auditActionLabel(log)}
            </span>
            <span className="audit-activity-main">
              <strong>{auditTargetLabel(log, officers)}</strong>
              <small>
                {auditModuleLabel(log.entity)} • {auditSummary(log)}
              </small>
            </span>
            <span className="audit-activity-meta">
              <strong>{actor?.displayName ?? "Sistema"}</strong>
              <small>{formatDateTime(log.createdAt)}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AuditPanel({
  logs,
  members,
  officers,
  canBackup,
  onInspect,
  onExport,
  onBackup,
  onRefresh
}: {
  logs: AuditLog[];
  members: GamMember[];
  officers: Officer[];
  canBackup: boolean;
  onInspect: (log: AuditLog) => void;
  onExport: (logs: AuditLog[]) => void;
  onBackup: () => void;
  onRefresh: () => void;
}) {
  const [actorFilter, setActorFilter] = useState("todos");
  const [entityFilter, setEntityFilter] = useState("todos");
  const [actionFilter, setActionFilter] = useState("todos");
  const [officerFilter, setOfficerFilter] = useState("todos");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const availableActions = useMemo(
    () => [...new Set(logs.map(auditActionLabel))].sort((a, b) => a.localeCompare(b)),
    [logs]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    return logs.filter((log) => {
      const actor = members.find((item) => item.userId === log.actorUserId);
      const createdTime = new Date(log.createdAt).getTime();
      const target = auditTargetLabel(log, officers);
      const summary = auditSummary(log);
      const matchesActor =
        actorFilter === "todos" || log.actorUserId === actorFilter;
      const matchesEntity =
        entityFilter === "todos" || log.entity === entityFilter;
      const matchesAction =
        actionFilter === "todos" || auditActionLabel(log) === actionFilter;
      const matchesOfficer =
        officerFilter === "todos" || getAuditOfficerId(log) === officerFilter;
      const matchesFrom = fromTime === null || createdTime >= fromTime;
      const matchesTo = toTime === null || createdTime <= toTime;
      const matchesSearch =
        !term ||
        target.toLowerCase().includes(term) ||
        summary.toLowerCase().includes(term) ||
        auditModuleLabel(log.entity).toLowerCase().includes(term) ||
        auditActionLabel(log).toLowerCase().includes(term) ||
        actor?.displayName.toLowerCase().includes(term) ||
        actor?.email.toLowerCase().includes(term);

      return (
        matchesActor &&
        matchesEntity &&
        matchesAction &&
        matchesOfficer &&
        matchesFrom &&
        matchesTo &&
        Boolean(matchesSearch)
      );
    });
  }, [
    actionFilter,
    actorFilter,
    entityFilter,
    fromDate,
    logs,
    members,
    officerFilter,
    officers,
    search,
    toDate
  ]);

  const created = filtered.filter((log) => log.action === "INSERT").length;
  const changed = filtered.filter((log) => log.action === "UPDATE").length;
  const deleted = filtered.filter((log) => log.action === "DELETE").length;

  function clearFilters() {
    setActorFilter("todos");
    setEntityFilter("todos");
    setActionFilter("todos");
    setOfficerFilter("todos");
    setFromDate("");
    setToDate("");
    setSearch("");
  }

  return (
    <>
      <div className="grid kpis audit-kpis">
        <Kpi label="Ações filtradas" value={filtered.length} detail={`${logs.length} registro(s) carregado(s)`} />
        <Kpi label="Criações" value={created} detail="Novos cadastros e registros" kind="good" />
        <Kpi label="Alterações" value={changed} detail="Inclui aprovações e rejeições" kind="warn" />
        <Kpi label="Exclusões" value={deleted} detail="Ações destrutivas rastreadas" kind={deleted > 0 ? "bad" : "good"} />
      </div>

      <div className="audit-toolbar margin-top">
        <div>
          <strong>Histórico operacional</strong>
          <span>Filtre por usuário, módulo, integrante ou período</span>
        </div>
        <button className="btn ghost" type="button" onClick={onRefresh}>
          Atualizar
        </button>
        <button className="btn secondary" type="button" onClick={() => onExport(filtered)} disabled={filtered.length === 0}>
          Exportar CSV
        </button>
        {canBackup && (
          <button className="btn" type="button" onClick={onBackup}>
            Gerar backup JSON
          </button>
        )}
      </div>

      <div className="audit-filters margin-top">
        <label>
          <span>Usuário</span>
          <select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)}>
            <option value="todos">Todos os usuários</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Módulo</span>
          <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
            <option value="todos">Todos os módulos</option>
            <option value="officers">Efetivo</option>
            <option value="weekly_entries">Lançamentos</option>
            <option value="discord_records">Discord</option>
            <option value="gam_members">Acessos</option>
            <option value="monthly_closures">Fechamento</option>
          </select>
        </label>
        <label>
          <span>Ação</span>
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="todos">Todas as ações</option>
            {availableActions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Integrante</span>
          <select value={officerFilter} onChange={(event) => setOfficerFilter(event.target.value)}>
            <option value="todos">Todos os integrantes</option>
            {officers.map((officer) => (
              <option key={officer.id} value={officer.id}>
                {officer.registration} — {officer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Data inicial</span>
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          <span>Data final</span>
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <label className="audit-search-field">
          <span>Busca</span>
          <input value={search} placeholder="Nome, ação, módulo ou resumo" onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button className="btn ghost audit-clear" type="button" onClick={clearFilters}>
          Limpar filtros
        </button>
      </div>

      <Card title="Linha do tempo" subtitle={`${filtered.length} ação(ões) encontrada(s)`} className="margin-top">
        <div className="table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Módulo</th>
                <th>Alvo</th>
                <th>Resumo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">Nenhuma ação encontrada com esses filtros.</td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const actor = members.find((item) => item.userId === log.actorUserId);
                  return (
                    <tr key={log.id}>
                      <td className="audit-date">{formatDateTime(log.createdAt)}</td>
                      <td>
                        <strong>{actor?.displayName ?? "Sistema"}</strong>
                        <br />
                        <span className="muted tiny">{actor?.role ?? "Usuário removido"}</span>
                      </td>
                      <td><span className={`audit-action ${auditActionClass(log)}`}>{auditActionLabel(log)}</span></td>
                      <td>{auditModuleLabel(log.entity)}</td>
                      <td><strong>{auditTargetLabel(log, officers)}</strong></td>
                      <td>{auditSummary(log)}</td>
                      <td>
                        <button className="table-action" type="button" onClick={() => onInspect(log)}>
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function AuditDetailModal({
  log,
  members,
  officers,
  onClose
}: {
  log: AuditLog;
  members: GamMember[];
  officers: Officer[];
  onClose: () => void;
}) {
  const actor = members.find((item) => item.userId === log.actorUserId);
  const changes = getAuditChanges(log);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card audit-detail-modal" role="dialog" aria-modal="true" aria-label="Detalhes da auditoria" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className={`audit-action ${auditActionClass(log)}`}>{auditActionLabel(log)}</span>
            <h2>{auditTargetLabel(log, officers)}</h2>
            <p>{auditModuleLabel(log.entity)} • {formatDateTime(log.createdAt)}</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="audit-detail-meta">
          <div><span>Responsável</span><strong>{actor?.displayName ?? "Sistema / usuário removido"}</strong></div>
          <div><span>Nível de acesso</span><strong>{actor?.role ?? "—"}</strong></div>
          <div><span>Identificador</span><strong className="audit-id">{log.entityId}</strong></div>
        </div>

        <div className="audit-change-list">
          {changes.length === 0 ? (
            <div className="empty">Nenhuma diferença de campo disponível.</div>
          ) : (
            changes.map((change) => (
              <div className="audit-change" key={change.key}>
                <strong>{change.label}</strong>
                <div>
                  <span>Antes</span>
                  <p>{displayAuditValue(change.before)}</p>
                </div>
                <div>
                  <span>Depois</span>
                  <p>{displayAuditValue(change.after)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button className="btn" type="button" onClick={onClose}>Fechar</button>
        </div>
      </section>
    </div>
  );
}

function ConfirmationDialog({
  request,
  onClose
}: {
  request: ConfirmationRequest;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const valid = !request.requiredText || typed.trim().toUpperCase() === request.requiredText;

  async function confirm() {
    if (!valid || running) return;
    setRunning(true);
    try {
      await request.onConfirm();
      onClose();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={running ? undefined : onClose}>
      <section className="modal-card confirm-modal" role="dialog" aria-modal="true" aria-label={request.title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="danger-label">Ação protegida</span>
            <h2>{request.title}</h2>
            <p>{request.message}</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={running} aria-label="Fechar">×</button>
        </div>

        {request.requiredText && (
          <label className="field confirm-field">
            <span>Digite <strong>{request.requiredText}</strong> para confirmar</span>
            <input autoFocus value={typed} onChange={(event) => setTyped(event.target.value.toUpperCase())} placeholder={request.requiredText} disabled={running} />
          </label>
        )}

        <div className="modal-actions">
          <button className="btn ghost" type="button" onClick={onClose} disabled={running}>Cancelar</button>
          <button className="btn danger-button" type="button" onClick={confirm} disabled={!valid || running}>
            {running ? "Processando..." : request.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function Intelligence({
  metrics,
  previousMetrics,
  week
}: {
  metrics: ReturnType<typeof getMetrics>[];
  previousMetrics: ReturnType<typeof getMetrics>[];
  week: number;
}) {
  const evolutions = metrics.filter(
    (item, index) => week > 1 && item.total > previousMetrics[index].total
  ).length;
  const drops = metrics.filter(
    (item, index) => week > 1 && item.total < previousMetrics[index].total
  ).length;
  const nearGoal = metrics.filter(
    (item) => item.situation === "PRÓXIMO DA META"
  ).length;
  const withoutEntry = metrics.filter(
    (item) => item.situation === "SEM REGISTRO"
  ).length;

  const priorities = [...metrics]
    .filter((item) => item.situation !== "META ATINGIDA")
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 6);

  const highlights = [...metrics]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <>
      <div className="grid kpis">
        <Kpi label="Evoluções" value={evolutions} detail="Comparação com semana anterior" kind="good" />
        <Kpi label="Quedas" value={drops} detail="Precisam de acompanhamento" kind={drops > 0 ? "bad" : ""} />
        <Kpi label="Próximos da meta" value={nearGoal} detail="Bom potencial de conclusão" kind="warn" />
        <Kpi label="Sem registro" value={withoutEntry} detail="Prioridade da supervisão" kind={withoutEntry > 0 ? "bad" : "good"} />
      </div>

      <div className="grid two margin-top">
        <Card title="Alertas prioritários" subtitle="Ação recomendada">
          <div className="alert-list">
            {priorities.length === 0 ? (
              <div className="empty">Sem alertas críticos.</div>
            ) : (
              priorities.map((item) => (
                <div className="alert" key={item.id}>
                  <div>
                    <h4>
                      {item.name} — {item.situation}
                    </h4>
                    <p>
                      {item.prisons} prisões, {item.pursuits} acompanhamentos.
                      Ação: {item.guidance.toLowerCase()}.
                    </p>
                  </div>
                  <Badge text={item.situation} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Destaques" subtitle="Melhores resultados">
          <div className="activity-list">
            {highlights.map((item, index) => (
              <div className="activity" key={item.id}>
                <Badge text={`${index + 1}º`} />
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.prisons} prisões • {item.pursuits} acompanhamentos
                  </small>
                </div>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

type ReportMetric = {
  id: string;
  registration: string;
  name: string;
  role: Officer["role"];
  prisons: number;
  pursuits: number;
  total: number;
  prisonTarget: number;
  pursuitTarget: number;
  progress: number;
  situation: ReturnType<typeof getMetrics>["situation"];
  guidance: string;
  weeksWithGoal: number;
  weeksWithRecord: number;
};

function getReportMetric(
  officer: Officer,
  entries: WeeklyEntry[],
  year: number,
  month: number,
  weeks: number[]
): ReportMetric {
  const periodEntries = entries.filter(
    (entry) =>
      entry.officerId === officer.id &&
      entry.year === year &&
      entry.month === month &&
      weeks.includes(entry.week)
  );
  const prisons = periodEntries.reduce((sum, item) => sum + item.prisons, 0);
  const pursuits = periodEntries.reduce((sum, item) => sum + item.pursuits, 0);
  const multiplier = Math.max(1, weeks.length);
  const prisonTarget = officer.prisonGoal * multiplier;
  const pursuitTarget = officer.pursuitGoal * multiplier;
  const prisonRate = prisonTarget > 0 ? prisons / prisonTarget : 0;
  const pursuitRate = pursuitTarget > 0 ? pursuits / pursuitTarget : 0;
  const progress = Math.min(1, (prisonRate + pursuitRate) / 2);

  let situation: ReportMetric["situation"] = "ABAIXO DA META";
  if (prisons === 0 && pursuits === 0) {
    situation = "SEM REGISTRO";
  } else if (prisons >= prisonTarget && pursuits >= pursuitTarget) {
    situation = "META ATINGIDA";
  } else if (prisons >= prisonTarget || pursuits >= pursuitTarget) {
    situation = "META PARCIAL";
  } else if (progress >= 0.75) {
    situation = "PRÓXIMO DA META";
  }

  const guidance =
    situation === "META ATINGIDA"
      ? "MANTER RITMO"
      : situation === "META PARCIAL"
        ? "CONCLUIR META"
        : situation === "PRÓXIMO DA META"
          ? "INCENTIVAR"
          : situation === "SEM REGISTRO"
            ? "VERIFICAR AUSÊNCIA"
            : "REFORÇAR ATIVIDADE";

  const weeklyMetrics = weeks.map((selectedWeek) =>
    getMetrics(officer, entries, year, month, selectedWeek)
  );

  return {
    id: officer.id,
    registration: officer.registration,
    name: officer.name,
    role: officer.role,
    prisons,
    pursuits,
    total: prisons + pursuits,
    prisonTarget,
    pursuitTarget,
    progress,
    situation,
    guidance,
    weeksWithGoal: weeklyMetrics.filter(
      (item) => item.situation === "META ATINGIDA"
    ).length,
    weeksWithRecord: weeklyMetrics.filter((item) => item.total > 0).length
  };
}

function ReportCenter({
  mode,
  onMode,
  officers,
  entries,
  month,
  week,
  year,
  responsibleName
}: {
  mode: ReportMode;
  onMode: (mode: ReportMode) => void;
  officers: Officer[];
  entries: WeeklyEntry[];
  month: number;
  week: number;
  year: number;
  responsibleName: string;
}) {
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const selectedWeeks = useMemo(
    () => (mode === "semanal" ? [week] : [...WEEKS]),
    [mode, week]
  );
  const reportMetrics = useMemo(
    () =>
      officers.map((officer) =>
        getReportMetric(officer, entries, year, month, selectedWeeks)
      ),
    [entries, month, officers, selectedWeeks, year]
  );
  const ranking = useMemo(
    () =>
      [...reportMetrics].sort(
        (a, b) => b.total - a.total || b.progress - a.progress
      ),
    [reportMetrics]
  );
  const selectedMetric =
    reportMetrics.find((item) => item.id === selectedOfficerId) ??
    ranking[0] ??
    null;
  const selectedOfficer = officers.find(
    (officer) => officer.id === selectedMetric?.id
  );
  const individualWeeks = selectedOfficer
    ? WEEKS.map((selectedWeek) =>
        getMetrics(selectedOfficer, entries, year, month, selectedWeek)
      )
    : [];
  const weeklyTotals = WEEKS.map((selectedWeek) => {
    const weekMetrics = officers.map((officer) =>
      getMetrics(officer, entries, year, month, selectedWeek)
    );
    return {
      week: selectedWeek,
      prisons: weekMetrics.reduce((sum, item) => sum + item.prisons, 0),
      pursuits: weekMetrics.reduce((sum, item) => sum + item.pursuits, 0),
      total: weekMetrics.reduce((sum, item) => sum + item.total, 0)
    };
  });
  const prisons = reportMetrics.reduce((sum, item) => sum + item.prisons, 0);
  const pursuits = reportMetrics.reduce((sum, item) => sum + item.pursuits, 0);
  const goals = reportMetrics.filter(
    (item) => item.situation === "META ATINGIDA"
  ).length;
  const alerts = reportMetrics.filter((item) =>
    ["SEM REGISTRO", "ABAIXO DA META"].includes(item.situation)
  ).length;
  const achievementRate = reportMetrics.length
    ? Math.round((goals / reportMetrics.length) * 100)
    : 0;
  const periodLabel =
    mode === "semanal"
      ? `Semana ${week} de ${MONTHS[month - 1]} de ${year}`
      : `${MONTHS[month - 1]} de ${year}`;
  const reportTitle =
    mode === "semanal" ? "RELATÓRIO OPERACIONAL SEMANAL" : "RELATÓRIO OPERACIONAL MENSAL";
  const maxWeeklyTotal = Math.max(1, ...weeklyTotals.map((item) => item.total));
  const bestWeek = [...weeklyTotals].sort((a, b) => b.total - a.total)[0];
  const attention = [...reportMetrics]
    .filter((item) => item.situation !== "META ATINGIDA")
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 6);

  function exportRankingCsv() {
    const lines = [
      [
        "Posição",
        "Matrícula",
        "Integrante",
        "Cargo",
        "Prisões",
        "Acompanhamentos",
        "Total",
        "Progresso",
        "Situação"
      ].map(csvCell).join(","),
      ...ranking.map((item, index) =>
        [
          index + 1,
          item.registration,
          item.name,
          item.role,
          item.prisons,
          item.pursuits,
          item.total,
          `${Math.round(item.progress * 100)}%`,
          item.situation
        ].map(csvCell).join(",")
      )
    ];
    downloadFile(
      `GAM_Relatorio_${mode}_${year}_${String(month).padStart(2, "0")}${
        mode === "semanal" ? `_S${week}` : ""
      }.csv`,
      `\uFEFF${lines.join("\n")}`,
      "text/csv;charset=utf-8"
    );
  }

  return (
    <>
      <div className="report-command-bar">
        <div className="report-period-switch" aria-label="Tipo de relatório">
          <button
            type="button"
            className={mode === "semanal" ? "active" : ""}
            onClick={() => onMode("semanal")}
          >
            Semanal
          </button>
          <button
            type="button"
            className={mode === "mensal" ? "active" : ""}
            onClick={() => onMode("mensal")}
          >
            Mensal
          </button>
        </div>

        <label className="report-officer-select">
          <span>Detalhamento individual</span>
          <select
            value={selectedMetric?.id ?? ""}
            onChange={(event) => setSelectedOfficerId(event.target.value)}
          >
            {ranking.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name} • {item.registration}
              </option>
            ))}
          </select>
        </label>

        <div className="report-export-actions">
          <button className="btn ghost" type="button" onClick={exportRankingCsv}>
            Exportar CSV
          </button>
          <button className="btn" type="button" onClick={() => window.print()}>
            Gerar PDF
          </button>
        </div>
      </div>

      <article className="professional-report">
        <header className="professional-report-header">
          <div className="professional-report-brand">
            <Image
              src="/gam-logo.png"
              alt="GAM Analytics"
              width={920}
              height={260}
              priority
            />
          </div>
          <div className="professional-report-heading">
            <span>COMANDO G.A.M • OÁSIS RP</span>
            <h2>{reportTitle}</h2>
            <p>{periodLabel}</p>
          </div>
          <div className="professional-report-code">
            <strong>GAM-{year}-{String(month).padStart(2, "0")}</strong>
            <span>{mode === "semanal" ? `S${week}` : "MENSAL"}</span>
          </div>
        </header>

        <div className="professional-report-body">
          <section className="report-summary-grid">
            <div>
              <span>Prisões</span>
              <strong>{prisons}</strong>
              <small>{mode === "mensal" ? "Acumulado do mês" : "Total da semana"}</small>
            </div>
            <div>
              <span>Acompanhamentos</span>
              <strong>{pursuits}</strong>
              <small>{mode === "mensal" ? "Acumulado do mês" : "Total da semana"}</small>
            </div>
            <div>
              <span>Metas atingidas</span>
              <strong>{goals}</strong>
              <small>{achievementRate}% do efetivo</small>
            </div>
            <div>
              <span>Pontos de atenção</span>
              <strong>{alerts}</strong>
              <small>Requerem supervisão</small>
            </div>
          </section>

          <section className="report-executive-summary">
            <div>
              <span className="report-section-kicker">RESUMO EXECUTIVO</span>
              <h3>Leitura do período</h3>
            </div>
            <p>
              No período de <strong>{periodLabel}</strong>, a unidade registrou{" "}
              <strong>{prisons} prisões</strong> e{" "}
              <strong>{pursuits} acompanhamentos</strong>. {goals} de{" "}
              {reportMetrics.length} integrante(s) atingiram a meta completa,
              representando {achievementRate}% do efetivo analisado.
              {mode === "mensal" && bestWeek.total > 0
                ? ` A Semana ${bestWeek.week} apresentou o maior volume operacional, com ${bestWeek.total} atividades.`
                : ranking[0]
                  ? ` O destaque do período foi ${ranking[0].name}, com ${ranking[0].total} atividades.`
                  : ""}
            </p>
          </section>

          <div className="report-main-grid">
            <section className="report-panel report-ranking-panel">
              <div className="report-panel-head">
                <div>
                  <span className="report-section-kicker">DESEMPENHO</span>
                  <h3>Ranking operacional</h3>
                </div>
                <small>{ranking.length} integrante(s)</small>
              </div>
              <div className="report-table-wrap">
                <table className="professional-report-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Integrante</th>
                      <th>Prisões</th>
                      <th>Acomp.</th>
                      <th>Total</th>
                      <th>Progresso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((item, index) => (
                      <tr key={item.id}>
                        <td><strong>{index + 1}º</strong></td>
                        <td>
                          <strong>{item.name}</strong>
                          <small>{item.registration} • {item.role}</small>
                        </td>
                        <td>{item.prisons}</td>
                        <td>{item.pursuits}</td>
                        <td><strong>{item.total}</strong></td>
                        <td>
                          <div className="report-progress-line">
                            <span style={{ width: `${Math.round(item.progress * 100)}%` }} />
                          </div>
                          <small>{Math.round(item.progress * 100)}% • {item.situation}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-panel report-evolution-panel">
              <div className="report-panel-head">
                <div>
                  <span className="report-section-kicker">EVOLUÇÃO</span>
                  <h3>Volume por semana</h3>
                </div>
                <small>{MONTHS[month - 1]}</small>
              </div>
              <div className="report-week-chart">
                {weeklyTotals.map((item) => (
                  <div
                    className={`report-week-column ${
                      mode === "semanal" && item.week === week ? "selected" : ""
                    }`}
                    key={item.week}
                  >
                    <strong>{item.total}</strong>
                    <div className="report-week-track">
                      <span
                        style={{
                          height: `${Math.max(4, (item.total / maxWeeklyTotal) * 100)}%`
                        }}
                      />
                    </div>
                    <small>S{item.week}</small>
                    <em>{item.prisons}P • {item.pursuits}A</em>
                  </div>
                ))}
              </div>
              <div className="report-chart-legend">
                <span><i className="legend-prisons" /> P = Prisões</span>
                <span><i className="legend-pursuits" /> A = Acompanhamentos</span>
              </div>
            </section>
          </div>

          {selectedMetric && selectedOfficer && (
            <section className="report-panel report-individual-panel">
              <div className="report-panel-head report-individual-head">
                <div>
                  <span className="report-section-kicker">ANÁLISE INDIVIDUAL</span>
                  <h3>{selectedMetric.name}</h3>
                  <small>{selectedMetric.registration} • {selectedMetric.role}</small>
                </div>
                <div className={`report-situation ${
                  selectedMetric.situation === "META ATINGIDA" ? "good" :
                  selectedMetric.situation === "SEM REGISTRO" ? "bad" : "warn"
                }`}>
                  {selectedMetric.situation}
                </div>
              </div>

              <div className="report-individual-grid">
                <div className="report-goal-card">
                  <span>Prisões</span>
                  <strong>{selectedMetric.prisons}</strong>
                  <small>Meta: {selectedMetric.prisonTarget}</small>
                  <div className="report-progress-line large">
                    <span style={{ width: `${Math.min(100, selectedMetric.prisonTarget ? (selectedMetric.prisons / selectedMetric.prisonTarget) * 100 : 0)}%` }} />
                  </div>
                </div>
                <div className="report-goal-card">
                  <span>Acompanhamentos</span>
                  <strong>{selectedMetric.pursuits}</strong>
                  <small>Meta: {selectedMetric.pursuitTarget}</small>
                  <div className="report-progress-line large pursuit">
                    <span style={{ width: `${Math.min(100, selectedMetric.pursuitTarget ? (selectedMetric.pursuits / selectedMetric.pursuitTarget) * 100 : 0)}%` }} />
                  </div>
                </div>
                <div className="report-goal-card compact">
                  <span>Semanas com registro</span>
                  <strong>{selectedMetric.weeksWithRecord}</strong>
                  <small>de {mode === "mensal" ? WEEKS.length : 1} considerada(s)</small>
                </div>
                <div className="report-goal-card compact">
                  <span>Orientação</span>
                  <strong className="guidance">{selectedMetric.guidance}</strong>
                  <small>Próxima ação sugerida</small>
                </div>
              </div>

              <div className="report-individual-weeks">
                {individualWeeks.map((item, index) => (
                  <div key={item.id} className={week === index + 1 ? "selected" : ""}>
                    <span>S{index + 1}</span>
                    <strong>{item.total}</strong>
                    <small>{item.prisons} prisões • {item.pursuits} acomp.</small>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="report-panel report-attention-panel">
            <div className="report-panel-head">
              <div>
                <span className="report-section-kicker">PLANO DE AÇÃO</span>
                <h3>Prioridades da supervisão</h3>
              </div>
              <small>{attention.length} prioridade(s)</small>
            </div>
            {attention.length === 0 ? (
              <p className="report-all-good">Todo o efetivo atingiu a meta no período.</p>
            ) : (
              <div className="report-attention-list">
                {attention.map((item, index) => (
                  <div key={item.id}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.situation} • {Math.round(item.progress * 100)}%</small>
                    </div>
                    <b>{item.guidance}</b>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="professional-report-footer">
            <div>
              <strong>GAM Analytics</strong>
              <span>Inteligência • Dados • Performance • Decisão</span>
            </div>
            <div>
              <span>Responsável pelo relatório</span>
              <strong>{responsibleName || "Comando G.A.M"}</strong>
            </div>
            <div>
              <span>Gerado em</span>
              <strong>{new Date().toLocaleDateString("pt-BR")}</strong>
            </div>
          </footer>
        </div>
      </article>
    </>
  );
}

function Closing({
  year,
  month,
  officers,
  entries,
  closures,
  onClose
}: {
  year: number;
  month: number;
  officers: Officer[];
  entries: WeeklyEntry[];
  closures: MonthClosure[];
  onClose: () => void;
}) {
  const monthEntries = entries.filter(
    (item) => item.year === year && item.month === month
  );
  const registeredOfficerIds = new Set(
    monthEntries.map((item) => item.officerId)
  );
  const pending = officers.filter(
    (officer) => !registeredOfficerIds.has(officer.id)
  ).length;
  const status =
    monthEntries.length === 0
      ? "AGUARDANDO LANÇAMENTOS"
      : pending > 0
        ? "PENDÊNCIAS"
        : "PRONTO PARA FECHAR";
  const existingClosure = closures.find(
    (item) => item.year === year && item.month === month
  );

  return (
    <>
      <div className="grid three">
        <Kpi
          label="Registros válidos"
          value={monthEntries.length}
          detail="Lançamentos do mês"
          kind="good"
        />
        <Kpi
          label="Pendências"
          value={pending}
          detail="Integrantes sem registro mensal"
          kind={pending > 0 ? "bad" : "good"}
        />
        <Kpi
          label="Status"
          value={existingClosure ? "ARQUIVADO" : status}
          detail={
            existingClosure
              ? `Fechado em ${new Date(
                  existingClosure.closedAt
                ).toLocaleDateString("pt-BR")}`
              : "Conferência automática"
          }
          kind={
            existingClosure || status === "PRONTO PARA FECHAR"
              ? "good"
              : "warn"
          }
        />
      </div>

      <div className="grid two margin-top">
        <Card title="Procedimento" subtitle="Fechamento seguro">
          <div className="alert-list">
            <InfoAlert
              title="1. Conferir os lançamentos"
              text="Todos os integrantes ativos devem estar com dados corretos."
              badge="1"
            />
            <InfoAlert
              title="2. Revisar alertas"
              text="Corrija ausências e cadastros inválidos antes de fechar."
              badge="2"
            />
            <InfoAlert
              title="3. Gerar relatório"
              text="Salve o relatório do comando em PDF."
              badge="3"
            />
            <InfoAlert
              title="4. Arquivar período"
              text="O banco grava uma fotografia imutável do mês."
              badge="4"
            />
          </div>
        </Card>

        <Card title="Arquivo mensal" subtitle="Integridade e histórico">
          {existingClosure ? (
            <div className="closure-box">
              <Badge text="ARQUIVADO" />
              <h3>
                {MONTHS[month - 1]} de {year}
              </h3>
              <p>
                Integridade:{" "}
                <code>{existingClosure.integrityHash.slice(0, 20)}…</code>
              </p>
            </div>
          ) : (
            <div className="closure-box">
              <h3>{status}</h3>
              <p>
                O fechamento cria um snapshot com hash de integridade e
                histórico de auditoria.
              </p>
              <button
                className="btn"
                onClick={onClose}
                disabled={status !== "PRONTO PARA FECHAR"}
              >
                Fechar e arquivar mês
              </button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export function GamApp() {
  return (
    <PasswordRecoveryGate>
      <GamAppProvider>
        <GamAppContent />
      </GamAppProvider>
    </PasswordRecoveryGate>
  );
}
