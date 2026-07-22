export type OfficerRole = "Oficial GAM" | "Estagiário";
export type OfficerStatus = "Ativo" | "Inativo";
export type OfficerGarrison = "Militar" | "Civil";

export type DiscordActivityType = "Prisão" | "Acompanhamento";
export type DiscordRecordStatus = "Pendente" | "Aprovado" | "Rejeitado";

export type DiscordQru =
  | "caixa eletronico"
  | "Banco Central"
  | "Joalheria"
  | "Registradora"
  | "Caixa de Luz"
  | "Corrida Ilegal"
  | "Los Santos"
  | "Outra";

export type AppRole = "Administrador" | "Supervisor" | "Consulta";
export type ApprovalStatus = "Pendente" | "Aprovado" | "Rejeitado";

export type AccessEventType =
  | "LOGIN_SUCESSO"
  | "LOGIN_FALHA"
  | "LOGOUT"
  | "SESSAO_EXPIRADA";

export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | string;

export type NotificationSeverity =
  | "info"
  | "success"
  | "warning"
  | "critical";

export type NotificationCategory =
  | "aprovacao"
  | "registro"
  | "meta"
  | "fechamento"
  | "sistema";

export type Screen =
  | "dashboard"
  | "notificacoes"
  | "efetivo"
  | "lancamentos"
  | "discord"
  | "supervisao"
  | "inteligencia"
  | "relatorio"
  | "fechamento"
  | "auditoria"
  | "acessos";

export interface NotificationRead {
  notificationId: string;
  readAt: string;
}

export interface OperationalNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  periodLabel: string;
  targetScreen: Screen;
  actionLabel: string;
  officerId?: string;
  createdAt?: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  ownerId: string;
  actorUserId: string | null;
  entity: string;
  entityId: string;
  action: AuditAction;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
}

export interface UserAccess {
  userId: string;
  ownerId: string;
  email: string;
  displayName: string;
  role: AppRole;
  active: boolean;
  approvalStatus: ApprovalStatus;
  requestedAt?: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
}

export interface GamMember {
  userId: string;
  ownerId: string;
  email: string;
  displayName: string;
  role: AppRole;
  active: boolean;
  approvalStatus: ApprovalStatus;
  requestedAt?: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  lastSeenAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccessEvent {
  id: string;
  ownerId: string;
  userId: string | null;
  email: string;
  eventType: AccessEventType;
  role?: AppRole | null;
  userAgent?: string;
  createdAt: string;
}

export interface Officer {
  id: string;
  registration: string;
  name: string;
  role: OfficerRole;
  garrison: OfficerGarrison;
  status: OfficerStatus;
  prisonGoal: number;
  pursuitGoal: number;
  photoUrl?: string;
  photoPath?: string;

  /**
   * ID numérico do usuário no Discord.
   * Este campo será utilizado pelo GAM Sync para localizar o integrante.
   */
  discordId?: string;

  /**
   * Campo antigo, mantido temporariamente para compatibilidade.
   * Será removido depois da atualização completa do cadastro.
   */
  discordUrl?: string;
}

export interface WeeklyEntry {
  id: string;
  officerId: string;
  year: number;
  month: number;
  week: number;
  prisons: number;
  pursuits: number;
  note: string;
  createdAt?: string;
}

export interface DiscordRecord {
  id: string;
  officerId: string;
  year: number;
  month: number;
  week: number;
  activityType: DiscordActivityType;
  quantity: number;

  /**
   * QRU vinculada ao acompanhamento.
   *
   * Deve ser preenchida somente quando activityType for "Acompanhamento".
   * Registros antigos podem permanecer sem QRU e serão exibidos como
   * "Não identificada" apenas na interface.
   */
  qru?: DiscordQru | null;

  /**
   * Link da mensagem usada como comprovação.
   * Este campo é diferente do ID pessoal do integrante.
   */
  discordUrl: string;

  note: string;
  status: DiscordRecordStatus;
  submittedBy: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason: string;
  approvalApplied: boolean;
  createdAt?: string;
}

export interface DiscordRecordInput {
  officerId: string;
  year: number;
  month: number;
  week: number;
  activityType: DiscordActivityType;
  quantity: number;

  /**
   * Obrigatória para acompanhamento e ausente para prisão.
   * A validação será aplicada no formulário e no repositório.
   */
  qru?: DiscordQru | null;

  discordUrl: string;
  note: string;
}

export interface DiscordRecordSaveResult {
  record: DiscordRecord;
  entry?: WeeklyEntry | null;
}

export interface MonthClosure {
  id: string;
  year: number;
  month: number;
  snapshot: Record<string, unknown>;
  integrityHash: string;
  closedAt: string;
}

export interface OfficerMetrics extends Officer {
  prisons: number;
  pursuits: number;
  total: number;
  progress: number;
  situation:
    | "META ATINGIDA"
    | "META PARCIAL"
    | "PRÓXIMO DA META"
    | "ABAIXO DA META"
    | "SEM REGISTRO"
    | "INATIVO";
  guidance: string;
}
