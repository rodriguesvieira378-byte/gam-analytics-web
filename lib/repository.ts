import { INITIAL_ENTRIES, INITIAL_OFFICERS } from "@/lib/constants";
import { createId } from "@/lib/calculations";
import { getSupabaseClient, isDemoMode } from "@/lib/supabase";
import type {
  AppRole,
  AuditLog,
  DiscordActivityType,
  DiscordRecord,
  DiscordRecordInput,
  DiscordRecordSaveResult,
  DiscordRecordStatus,
  GamMember,
  MonthClosure,
  NotificationRead,
  Officer,
  OfficerGarrison,
  OfficerRole,
  OfficerStatus,
  UserAccess,
  WeeklyEntry
} from "@/lib/types";

const KEYS = {
  session: "gam.web.session",
  officers: "gam.web.officers",
  entries: "gam.web.entries",
  discordRecords: "gam.web.discord-records",
  closures: "gam.web.closures",
  access: "gam.web.access",
  members: "gam.web.members",
  auditLogs: "gam.web.audit-logs",
  notificationReads: "gam.web.notification-reads"
};

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  const value = window.localStorage.getItem(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function appendDemoAudit(
  entity: string,
  entityId: string,
  action: "INSERT" | "UPDATE" | "DELETE",
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
) {
  const access = readLocal<UserAccess | null>(KEYS.access, null) ?? demoAccess();
  const logs = readLocal<AuditLog[]>(KEYS.auditLogs, []);
  const log: AuditLog = {
    id: createId("audit"),
    ownerId: access.ownerId,
    actorUserId: access.userId,
    entity,
    entityId,
    action,
    oldData,
    newData,
    createdAt: new Date().toISOString()
  };
  writeLocal(KEYS.auditLogs, [log, ...logs].slice(0, 1000));
}

export function normalizeDiscordMessageUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new Error("Cole o link da mensagem do Discord.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("O link do Discord não é válido.");
  }

  const allowedHosts = new Set([
    "discord.com",
    "www.discord.com",
    "ptb.discord.com",
    "canary.discord.com",
    "discordapp.com",
    "www.discordapp.com"
  ]);

  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
    throw new Error("Use o link original da mensagem no Discord.");
  }

  const match = parsed.pathname.match(
    /^\/channels\/(\d+)\/(\d+)\/(\d+)\/?$/
  );

  if (!match) {
    throw new Error(
      "O link precisa ser de uma mensagem do servidor do Discord."
    );
  }

  return `https://discord.com/channels/${match[1]}/${match[2]}/${match[3]}`;
}

const OFFICER_PHOTO_BUCKET = "officer-photos";
const MAX_OFFICER_PHOTO_SIZE = 5 * 1024 * 1024;
const OFFICER_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateOfficerPhoto(file: File) {
  if (!OFFICER_PHOTO_TYPES.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG ou WEBP.");
  }

  if (file.size > MAX_OFFICER_PHOTO_SIZE) {
    throw new Error("A foto pode ter no máximo 5 MB.");
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function officerFromRow(row: Record<string, unknown>): Officer {
  return {
    id: String(row.id),
    registration: String(row.registration ?? ""),
    name: String(row.name ?? ""),
    role: String(row.role) as OfficerRole,
    garrison: String(row.garrison ?? "Militar") as OfficerGarrison,
    status: String(row.status) as OfficerStatus,
    prisonGoal: Number(row.prison_goal ?? 0),
    pursuitGoal: Number(row.pursuit_goal ?? 0),
    photoUrl: row.photo_url ? String(row.photo_url) : undefined,
    photoPath: row.photo_path ? String(row.photo_path) : undefined,
    discordUrl: row.discord_url ? String(row.discord_url) : undefined
  };
}

async function resolveOfficerPhoto(officer: Officer): Promise<Officer> {
  if (isDemoMode || !officer.photoPath) return officer;

  const { data, error } = await getSupabaseClient()
    .storage
    .from(OFFICER_PHOTO_BUCKET)
    .createSignedUrl(officer.photoPath, 60 * 60);

  if (error || !data?.signedUrl) return officer;
  return { ...officer, photoUrl: data.signedUrl };
}

function officerDataError(error: { code?: string; message?: string }) {
  const message = String(error.message ?? "");
  const missingIdentityField =
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("photo_url") ||
    message.includes("photo_path") ||
    message.includes("discord_url") ||
    message.includes("garrison");

  if (missingIdentityField) {
    return new Error(
      "O banco do Efetivo ainda não possui todos os campos da identidade. Execute o SQL da V0.7.2 no Supabase."
    );
  }

  if (error.code === "23505") {
    return new Error("Já existe um integrante com esta matrícula.");
  }

  return new Error(message || "Falha ao acessar os dados do efetivo.");
}

function demoAccess(email?: string | null): UserAccess {
  const now = new Date().toISOString();

  return {
    userId: "demo-admin",
    ownerId: "demo-admin",
    email: email || "admin@gam.local",
    displayName: "Cássio Vieira",
    role: "Administrador",
    active: true,
    approvalStatus: "Aprovado",
    requestedAt: now,
    approvedAt: now,
    approvedBy: "demo-admin",
    lastLoginAt: now,
    lastLogoutAt: null
  };
}

function mapAccess(data: unknown): UserAccess {
  if (!data || typeof data !== "object") {
    throw new Error("Seu cadastro ainda não está vinculado ao GAM Analytics.");
  }

  const item = data as Record<string, unknown>;
  const approvalStatus = String(
    item.approval_status ?? "Aprovado"
  ) as UserAccess["approvalStatus"];

  if (approvalStatus === "Pendente") {
    throw new Error(
      "Seu cadastro está aguardando aprovação de um administrador."
    );
  }

  if (approvalStatus === "Rejeitado") {
    const reason = String(item.rejection_reason ?? "").trim();

    throw new Error(
      reason
        ? `Seu pedido de acesso foi rejeitado. Motivo: ${reason}`
        : "Seu pedido de acesso não foi aprovado. Procure a administração da G.A.M."
    );
  }

  if (!item.user_id || !item.owner_id || !item.role || item.active === false) {
    throw new Error(
      "Seu acesso ao GAM Analytics está desativado. Procure a administração da G.A.M."
    );
  }

  return {
    userId: String(item.user_id),
    ownerId: String(item.owner_id),
    email: String(item.email ?? ""),
    displayName: String(item.display_name ?? "Usuário GAM"),
    role: String(item.role) as AppRole,
    active: Boolean(item.active),
    approvalStatus,
    requestedAt: item.requested_at
      ? String(item.requested_at)
      : undefined,
    approvedAt: item.approved_at
      ? String(item.approved_at)
      : null,
    approvedBy: item.approved_by
      ? String(item.approved_by)
      : null,
    lastLoginAt: item.last_login_at
      ? String(item.last_login_at)
      : null,
    lastLogoutAt: item.last_logout_at
      ? String(item.last_logout_at)
      : null
  };
}

export async function loadCurrentUserAccess(): Promise<UserAccess | null> {
  if (isDemoMode) {
    const stored = readLocal<UserAccess | null>(KEYS.access, null);
    return stored ?? demoAccess();
  }

  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw new Error(sessionError.message);
  if (!sessionData.session) return null;

  const { data, error } = await supabase.rpc("get_current_gam_access_v2");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "Execute a atualização RC1.2.2 no SQL Editor do Supabase."
      );
    }
    throw new Error(error.message);
  }

  try {
    return mapAccess(data);
  } catch (cause) {
    await supabase.auth.signOut();
    throw cause;
  }
}

export async function loadSession(): Promise<UserAccess | null> {
  if (isDemoMode) {
    const session = window.localStorage.getItem(KEYS.session);
    return session ? demoAccess(session) : null;
  }

  const supabase = getSupabaseClient();

  if (typeof window !== "undefined" && window.location.hash) {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const errorDescription = hash.get("error_description");

    if (errorDescription) {
      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${window.location.search}`
      );
      throw new Error(decodeURIComponent(errorDescription));
    }

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) throw new Error(error.message);

      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${window.location.search}`
      );
    }
  }

  return loadCurrentUserAccess();
}

export async function requestGamAccess(input: {
  displayName: string;
  email: string;
  password: string;
}) {
  const displayName = input.displayName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!displayName) {
    throw new Error("Informe seu nome.");
  }

  if (!email) {
    throw new Error("Informe seu e-mail.");
  }

  if (password.length < 8) {
    throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  }

  if (isDemoMode) {
    throw new Error(
      "A solicitação de acesso exige o Supabase conectado."
    );
  }

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;

  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        display_name: displayName
      }
    }
  });

  if (error) {
    if (
      error.message.toLowerCase().includes("already registered") ||
      error.message.toLowerCase().includes("already been registered")
    ) {
      throw new Error(
        "Este e-mail já possui uma conta. Use o login ou recupere sua senha."
      );
    }

    throw new Error(error.message);
  }

  if (data.session) {
    await getSupabaseClient().auth.signOut();
  }

  return {
    needsEmailConfirmation: !data.session
  };
}

export async function signIn(email: string, password: string) {
  if (isDemoMode) {
    if (!password.trim()) throw new Error("Informe a senha.");
    const access = demoAccess(email);
    window.localStorage.setItem(KEYS.session, email);
    writeLocal(KEYS.access, access);
    return access;
  }

  const { error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password
  });

  if (error) throw new Error(error.message);

  const access = await loadCurrentUserAccess();
  if (!access) {
    throw new Error("Seu usuário ainda não possui acesso ao GAM Analytics.");
  }
  return access;
}

export async function signOut() {
  if (isDemoMode) {
    window.localStorage.removeItem(KEYS.session);
    window.localStorage.removeItem(KEYS.access);
    return;
  }

  await getSupabaseClient().auth.signOut();
}

function mapMember(row: Record<string, unknown>): GamMember {
  return {
    userId: String(row.user_id),
    ownerId: String(row.owner_id),
    email: String(row.email ?? ""),
    displayName: String(row.display_name ?? "Usuário GAM"),
    role: String(row.role) as AppRole,
    active: Boolean(row.active),
    approvalStatus: String(
      row.approval_status ?? "Aprovado"
    ) as GamMember["approvalStatus"],
    requestedAt: row.requested_at
      ? String(row.requested_at)
      : undefined,
    approvedAt: row.approved_at
      ? String(row.approved_at)
      : null,
    approvedBy: row.approved_by
      ? String(row.approved_by)
      : null,
    rejectedAt: row.rejected_at
      ? String(row.rejected_at)
      : null,
    rejectedBy: row.rejected_by
      ? String(row.rejected_by)
      : null,
    rejectionReason: String(row.rejection_reason ?? ""),
    lastLoginAt: row.last_login_at
      ? String(row.last_login_at)
      : null,
    lastLogoutAt: row.last_logout_at
      ? String(row.last_logout_at)
      : null,
    lastSeenAt: row.last_seen_at
      ? String(row.last_seen_at)
      : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

export async function loadGamMembers(): Promise<GamMember[]> {
  if (isDemoMode) {
    const stored = readLocal<GamMember[]>(KEYS.members, []);
    if (stored.length > 0) return stored;
    const access = demoAccess();
    const initial: GamMember[] = [{
      userId: access.userId,
      ownerId: access.ownerId,
      email: access.email,
      displayName: access.displayName,
      role: access.role,
      active: true,
      approvalStatus: "Aprovado",
      requestedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: access.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    writeLocal(KEYS.members, initial);
    return initial;
  }

  const { data, error } = await getSupabaseClient().rpc("list_gam_members_v2");
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []).map((row) => mapMember(row));
}

function mapAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    entity: String(row.entity ?? ""),
    entityId: String(row.entity_id ?? ""),
    action: String(row.action ?? ""),
    oldData:
      row.old_data && typeof row.old_data === "object"
        ? (row.old_data as Record<string, unknown>)
        : null,
    newData:
      row.new_data && typeof row.new_data === "object"
        ? (row.new_data as Record<string, unknown>)
        : null,
    createdAt: String(row.created_at ?? "")
  };
}

export async function loadAuditLogs(limit = 1000): Promise<AuditLog[]> {
  if (isDemoMode) {
    return readLocal<AuditLog[]>(KEYS.auditLogs, []).slice(0, limit);
  }

  const { data, error } = await getSupabaseClient()
    .from("audit_logs")
    .select(
      "id, owner_id, actor_user_id, entity, entity_id, action, old_data, new_data, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 1000));

  if (error) {
    if (
      error.code === "42703" ||
      error.code === "42P01" ||
      error.code === "PGRST204" ||
      error.code === "PGRST205"
    ) {
      throw new Error(
        "Execute primeiro a atualização V0.5 no SQL Editor do Supabase."
      );
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapAuditLog(row as Record<string, unknown>)
  );
}


function mapNotificationRead(row: Record<string, unknown>): NotificationRead {
  return {
    notificationId: String(row.notification_id ?? ""),
    readAt: String(row.read_at ?? "")
  };
}

export async function loadNotificationReads(): Promise<NotificationRead[]> {
  if (isDemoMode) {
    return readLocal<NotificationRead[]>(KEYS.notificationReads, []);
  }

  const { data, error } = await getSupabaseClient()
    .from("notification_reads")
    .select("notification_id, read_at")
    .order("read_at", { ascending: false });

  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST204" ||
      error.code === "PGRST205"
    ) {
      throw new Error(
        "Execute primeiro a atualização V0.7 no SQL Editor do Supabase."
      );
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapNotificationRead(row as Record<string, unknown>)
  );
}

export async function setNotificationRead(
  notificationId: string,
  read: boolean
): Promise<NotificationRead | null> {
  const normalizedId = notificationId.trim();
  if (!normalizedId) throw new Error("Notificação inválida.");

  if (isDemoMode) {
    const reads = readLocal<NotificationRead[]>(KEYS.notificationReads, []);
    if (!read) {
      writeLocal(
        KEYS.notificationReads,
        reads.filter((item) => item.notificationId !== normalizedId)
      );
      return null;
    }

    const item: NotificationRead = {
      notificationId: normalizedId,
      readAt: new Date().toISOString()
    };
    writeLocal(KEYS.notificationReads, [
      item,
      ...reads.filter((current) => current.notificationId !== normalizedId)
    ]);
    return item;
  }

  if (!read) {
    const { error } = await getSupabaseClient()
      .from("notification_reads")
      .delete()
      .eq("notification_id", normalizedId);
    if (error) throw new Error(error.message);
    return null;
  }

  const readAt = new Date().toISOString();
  const { data, error } = await getSupabaseClient()
    .from("notification_reads")
    .upsert(
      { notification_id: normalizedId, read_at: readAt },
      { onConflict: "user_id,notification_id" }
    )
    .select("notification_id, read_at")
    .single();

  if (error) throw new Error(error.message);
  return mapNotificationRead(data as Record<string, unknown>);
}

export async function markNotificationsRead(
  notificationIds: string[]
): Promise<NotificationRead[]> {
  const ids = [...new Set(notificationIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  if (isDemoMode) {
    const current = readLocal<NotificationRead[]>(KEYS.notificationReads, []);
    const now = new Date().toISOString();
    const existing = new Map(current.map((item) => [item.notificationId, item]));
    for (const id of ids) {
      existing.set(id, { notificationId: id, readAt: now });
    }
    const next = [...existing.values()];
    writeLocal(KEYS.notificationReads, next);
    return next;
  }

  const readAt = new Date().toISOString();
  const { data, error } = await getSupabaseClient()
    .from("notification_reads")
    .upsert(
      ids.map((id) => ({ notification_id: id, read_at: readAt })),
      { onConflict: "user_id,notification_id" }
    )
    .select("notification_id, read_at");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    mapNotificationRead(row as Record<string, unknown>)
  );
}

export async function addGamMember(input: {
  email: string;
  displayName: string;
  role: AppRole;
}): Promise<GamMember> {
  if (isDemoMode) {
    const members = await loadGamMembers();
    if (members.some((item) => item.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("Este e-mail já está vinculado à unidade.");
    }
    const member: GamMember = {
      userId: createId("user"),
      ownerId: "demo-admin",
      email: input.email.trim().toLowerCase(),
      displayName: input.displayName.trim() || input.email.trim(),
      role: input.role,
      active: true,
      approvalStatus: "Aprovado",
      requestedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: "demo-admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeLocal(KEYS.members, [...members, member]);
    appendDemoAudit(
      "gam_members",
      member.userId,
      "INSERT",
      null,
      member as unknown as Record<string, unknown>
    );
    return member;
  }

  const { data, error } = await getSupabaseClient().rpc(
    "add_gam_member_by_email",
    {
      p_email: input.email.trim().toLowerCase(),
      p_display_name: input.displayName.trim(),
      p_role: input.role
    }
  );

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return mapMember(row as Record<string, unknown>);
}

export async function approveGamMember(
  userId: string,
  role: AppRole
): Promise<GamMember> {
  if (isDemoMode) {
    const members = await loadGamMembers();
    const index = members.findIndex(
      (member) => member.userId === userId
    );

    if (index < 0) {
      throw new Error("Solicitação não encontrada.");
    }

    const previous = { ...members[index] };
    const now = new Date().toISOString();

    members[index] = {
      ...members[index],
      role,
      active: true,
      approvalStatus: "Aprovado",
      approvedAt: now,
      approvedBy: "demo-admin",
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: "",
      updatedAt: now
    };

    writeLocal(KEYS.members, members);

    appendDemoAudit(
      "gam_members",
      userId,
      "UPDATE",
      previous as unknown as Record<string, unknown>,
      members[index] as unknown as Record<string, unknown>
    );

    return members[index];
  }

  const { data, error } = await getSupabaseClient().rpc(
    "approve_gam_member",
    {
      p_user_id: userId,
      p_role: role
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error("A solicitação não foi encontrada.");
  }

  return mapMember(
    row as Record<string, unknown>
  );
}

export async function rejectGamMember(
  userId: string,
  reason: string
): Promise<GamMember> {
  const normalizedReason = reason.trim();

  if (normalizedReason.length < 3) {
    throw new Error("Informe o motivo da rejeição.");
  }

  if (isDemoMode) {
    const members = await loadGamMembers();
    const index = members.findIndex(
      (member) => member.userId === userId
    );

    if (index < 0) {
      throw new Error("Solicitação não encontrada.");
    }

    const previous = { ...members[index] };
    const now = new Date().toISOString();

    members[index] = {
      ...members[index],
      active: false,
      approvalStatus: "Rejeitado",
      rejectedAt: now,
      rejectedBy: "demo-admin",
      rejectionReason: normalizedReason,
      updatedAt: now
    };

    writeLocal(KEYS.members, members);

    appendDemoAudit(
      "gam_members",
      userId,
      "UPDATE",
      previous as unknown as Record<string, unknown>,
      members[index] as unknown as Record<string, unknown>
    );

    return members[index];
  }

  const { data, error } = await getSupabaseClient().rpc(
    "reject_gam_member",
    {
      p_user_id: userId,
      p_reason: normalizedReason
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error("A solicitação não foi encontrada.");
  }

  return mapMember(
    row as Record<string, unknown>
  );
}

export async function updateGamMember(input: {
  userId: string;
  displayName: string;
  role: AppRole;
  active: boolean;
}): Promise<GamMember> {
  if (isDemoMode) {
    const members = await loadGamMembers();
    const index = members.findIndex((item) => item.userId === input.userId);
    if (index < 0) throw new Error("Usuário não encontrado.");
    const previous = { ...members[index] };
    members[index] = {
      ...members[index],
      displayName: input.displayName.trim(),
      role: input.role,
      active: input.active,
      updatedAt: new Date().toISOString()
    };
    writeLocal(KEYS.members, members);
    appendDemoAudit(
      "gam_members",
      members[index].userId,
      "UPDATE",
      previous as unknown as Record<string, unknown>,
      members[index] as unknown as Record<string, unknown>
    );
    return members[index];
  }

  const { data, error } = await getSupabaseClient().rpc("update_gam_member", {
    p_user_id: input.userId,
    p_display_name: input.displayName.trim(),
    p_role: input.role,
    p_active: input.active
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return mapMember(row as Record<string, unknown>);
}

export async function loadOfficers(): Promise<Officer[]> {
  if (isDemoMode) {
    const stored = readLocal<Officer[]>(KEYS.officers, []);
    if (stored.length > 0) {
      return stored.map((officer) => ({
        ...officer,
        garrison: officer.garrison ?? "Militar"
      }));
    }
    writeLocal(KEYS.officers, INITIAL_OFFICERS);
    return INITIAL_OFFICERS;
  }

  const { data, error } = await getSupabaseClient()
    .from("officers")
    .select(
      "id, registration, name, role, garrison, status, prison_goal, pursuit_goal, photo_url, photo_path, discord_url"
    )
    .order("registration");

  if (error) throw officerDataError(error);

  return Promise.all(
    (data ?? []).map((row) =>
      resolveOfficerPhoto(officerFromRow(row as Record<string, unknown>))
    )
  );
}

export async function loadEntries(): Promise<WeeklyEntry[]> {
  if (isDemoMode) {
    const stored = readLocal<WeeklyEntry[]>(KEYS.entries, []);
    if (stored.length > 0) return stored;
    writeLocal(KEYS.entries, INITIAL_ENTRIES);
    return INITIAL_ENTRIES;
  }

  const { data, error } = await getSupabaseClient()
    .from("weekly_entries")
    .select(
      "id, officer_id, year, month, week, prisons, pursuits, note, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    officerId: row.officer_id,
    year: row.year,
    month: row.month,
    week: row.week,
    prisons: row.prisons,
    pursuits: row.pursuits,
    note: row.note ?? "",
    createdAt: row.created_at
  }));
}

export async function loadDiscordRecords(): Promise<DiscordRecord[]> {
  if (isDemoMode) {
    return readLocal<DiscordRecord[]>(KEYS.discordRecords, []).map((record) => ({
      ...record,
      status: record.status ?? "Aprovado",
      submittedBy: record.submittedBy ?? "demo-admin",
      reviewedBy: record.reviewedBy ?? "demo-admin",
      reviewedAt: record.reviewedAt ?? record.createdAt ?? null,
      rejectionReason: record.rejectionReason ?? "",
      approvalApplied: record.approvalApplied ?? true
    }));
  }

  const { data, error } = await getSupabaseClient()
    .from("discord_records")
    .select(
      "id, officer_id, year, month, week, activity_type, quantity, discord_url, note, status, submitted_by, reviewed_by, reviewed_at, rejection_reason, approval_applied, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    officerId: row.officer_id,
    year: row.year,
    month: row.month,
    week: row.week,
    activityType: row.activity_type as DiscordActivityType,
    quantity: row.quantity,
    discordUrl: row.discord_url,
    note: row.note ?? "",
    status: row.status as DiscordRecordStatus,
    submittedBy: row.submitted_by ?? "",
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    rejectionReason: row.rejection_reason ?? "",
    approvalApplied: Boolean(row.approval_applied),
    createdAt: row.created_at
  }));
}

export async function saveOfficer(officer: Officer): Promise<Officer> {
  const isNewOfficer = !officer.id;
  const normalized: Officer = {
    ...officer,
    id: officer.id || (isDemoMode ? createId("officer") : ""),
    registration: officer.registration.trim(),
    name: officer.name.trim(),
    garrison: officer.garrison ?? "Militar",
    discordUrl: officer.discordUrl?.trim() || undefined,
    prisonGoal: officer.role === "Oficial GAM" ? 4 : 6,
    pursuitGoal: officer.role === "Oficial GAM" ? 6 : 12
  };

  if (!normalized.registration) throw new Error("Informe a matrícula.");
  if (!normalized.name) throw new Error("Informe o QRA / nome.");

  if (isDemoMode) {
    const officers = await loadOfficers();
    const duplicate = officers.find(
      (item) =>
        item.id !== normalized.id &&
        item.registration.toLowerCase() === normalized.registration.toLowerCase()
    );
    if (duplicate) throw new Error("Já existe um integrante com esta matrícula.");

    const index = officers.findIndex((item) => item.id === normalized.id);
    const previous = index >= 0 ? { ...officers[index] } : null;
    if (index >= 0) officers[index] = normalized;
    else officers.push(normalized);

    writeLocal(KEYS.officers, officers);
    appendDemoAudit(
      "officers",
      normalized.id,
      previous ? "UPDATE" : "INSERT",
      previous as unknown as Record<string, unknown> | null,
      normalized as unknown as Record<string, unknown>
    );
    return normalized;
  }

  const payload = {
    registration: normalized.registration,
    name: normalized.name,
    role: normalized.role,
    garrison: normalized.garrison,
    status: normalized.status,
    prison_goal: normalized.prisonGoal,
    pursuit_goal: normalized.pursuitGoal,
    photo_url: normalized.photoPath
      ? null
      : normalized.photoUrl?.startsWith("data:")
        ? null
        : normalized.photoUrl ?? null,
    photo_path: normalized.photoPath ?? null,
    discord_url: normalized.discordUrl ?? null
  };

  const query = isNewOfficer
    ? getSupabaseClient().from("officers").insert(payload)
    : getSupabaseClient().from("officers").update(payload).eq("id", normalized.id);

  const { data, error } = await query
    .select(
      "id, registration, name, role, garrison, status, prison_goal, pursuit_goal, photo_url, photo_path, discord_url"
    )
    .single();

  if (error) throw officerDataError(error);
  return resolveOfficerPhoto(officerFromRow(data as Record<string, unknown>));
}

export async function uploadOfficerPhoto(
  officer: Officer,
  file: File
): Promise<Officer> {
  if (!officer.id) throw new Error("Salve o integrante antes de enviar a foto.");
  validateOfficerPhoto(file);

  if (isDemoMode) {
    const photoUrl = await fileToDataUrl(file);
    return saveOfficer({
      ...officer,
      photoUrl,
      photoPath: `demo/${officer.id}/${file.name}`
    });
  }

  const access = await loadCurrentUserAccess();
  if (!access || access.role !== "Administrador") {
    throw new Error("Somente o administrador pode alterar fotos do efetivo.");
  }

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${access.ownerId}/${officer.id}/${Date.now()}.${extension}`;
  const supabase = getSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from(OFFICER_PHOTO_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes("bucket")) {
      throw new Error(
        "Execute a atualização V0.7.1 para criar o armazenamento de fotos."
      );
    }
    throw new Error(uploadError.message);
  }

  const previousPath = officer.photoPath;
  const { data, error } = await supabase
    .from("officers")
    .update({ photo_path: path, photo_url: null })
    .eq("id", officer.id)
    .select(
      "id, registration, name, role, garrison, status, prison_goal, pursuit_goal, photo_url, photo_path, discord_url"
    )
    .single();

  if (error) {
    await supabase.storage.from(OFFICER_PHOTO_BUCKET).remove([path]);
    throw officerDataError(error);
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from(OFFICER_PHOTO_BUCKET).remove([previousPath]);
  }

  return resolveOfficerPhoto(
    officerFromRow(data as Record<string, unknown>)
  );
}

export async function removeOfficerPhoto(officer: Officer): Promise<Officer> {
  if (!officer.id) throw new Error("Integrante inválido.");

  if (isDemoMode) {
    return saveOfficer({ ...officer, photoUrl: undefined, photoPath: undefined });
  }

  const access = await loadCurrentUserAccess();
  if (!access || access.role !== "Administrador") {
    throw new Error("Somente o administrador pode remover fotos do efetivo.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("officers")
    .update({ photo_path: null, photo_url: null })
    .eq("id", officer.id)
    .select(
      "id, registration, name, role, garrison, status, prison_goal, pursuit_goal, photo_url, photo_path, discord_url"
    )
    .single();

  if (error) throw officerDataError(error);

  if (officer.photoPath) {
    await supabase.storage
      .from(OFFICER_PHOTO_BUCKET)
      .remove([officer.photoPath]);
  }

  return officerFromRow(data as Record<string, unknown>);
}

export async function saveEntry(entry: WeeklyEntry): Promise<WeeklyEntry> {
  if (isDemoMode) {
    const entries = await loadEntries();
    const index = entries.findIndex(
      (item) =>
        item.officerId === entry.officerId &&
        item.year === entry.year &&
        item.month === entry.month &&
        item.week === entry.week
    );

    const previous = index >= 0 ? { ...entries[index] } : null;
    const normalized = {
      ...entry,
      id: index >= 0 ? entries[index].id : entry.id || createId("entry")
    };

    if (index >= 0) entries[index] = normalized;
    else entries.push(normalized);

    writeLocal(KEYS.entries, entries);
    appendDemoAudit(
      "weekly_entries",
      normalized.id,
      previous ? "UPDATE" : "INSERT",
      previous as unknown as Record<string, unknown> | null,
      normalized as unknown as Record<string, unknown>
    );
    return normalized;
  }

  const { data, error } = await getSupabaseClient()
    .from("weekly_entries")
    .upsert(
      {
        officer_id: entry.officerId,
        year: entry.year,
        month: entry.month,
        week: entry.week,
        prisons: entry.prisons,
        pursuits: entry.pursuits,
        note: entry.note
      },
      { onConflict: "owner_id,officer_id,year,month,week" }
    )
    .select(
      "id, officer_id, year, month, week, prisons, pursuits, note, created_at"
    )
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    officerId: data.officer_id,
    year: data.year,
    month: data.month,
    week: data.week,
    prisons: data.prisons,
    pursuits: data.pursuits,
    note: data.note ?? "",
    createdAt: data.created_at
  };
}

function mapDiscordRecord(row: Record<string, unknown>): DiscordRecord {
  return {
    id: String(row.id),
    officerId: String(row.officer_id),
    year: Number(row.year),
    month: Number(row.month),
    week: Number(row.week),
    activityType: String(row.activity_type) as DiscordActivityType,
    quantity: Number(row.quantity),
    discordUrl: String(row.discord_url),
    note: String(row.note ?? ""),
    status: String(row.status ?? "Pendente") as DiscordRecordStatus,
    submittedBy: String(row.submitted_by ?? ""),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    rejectionReason: String(row.rejection_reason ?? ""),
    approvalApplied: Boolean(row.approval_applied),
    createdAt: String(row.created_at ?? "")
  };
}

function mapWeeklyEntry(row: Record<string, unknown> | null | undefined) {
  if (!row || !row.id) return null;
  return {
    id: String(row.id),
    officerId: String(row.officer_id),
    year: Number(row.year),
    month: Number(row.month),
    week: Number(row.week),
    prisons: Number(row.prisons),
    pursuits: Number(row.pursuits),
    note: String(row.note ?? ""),
    createdAt: String(row.created_at ?? "")
  } satisfies WeeklyEntry;
}

function mapDiscordRpcResult(data: unknown): DiscordRecordSaveResult {
  if (!data || typeof data !== "object") {
    throw new Error("O banco não retornou o registro salvo.");
  }

  const result = data as {
    record?: Record<string, unknown>;
    entry?: Record<string, unknown> | null;
  };

  if (!result.record) {
    throw new Error("O banco retornou uma resposta incompleta.");
  }

  return {
    record: mapDiscordRecord(result.record),
    entry: mapWeeklyEntry(result.entry)
  };
}

export async function saveDiscordRecord(
  input: DiscordRecordInput
): Promise<DiscordRecordSaveResult> {
  const normalizedUrl = normalizeDiscordMessageUrl(input.discordUrl);

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error("A quantidade precisa ser pelo menos 1.");
  }

  if (isDemoMode) {
    const records = await loadDiscordRecords();

    if (records.some((record) => record.discordUrl === normalizedUrl)) {
      throw new Error("Este link do Discord já foi utilizado.");
    }

    const access = (await loadCurrentUserAccess()) ?? demoAccess();
    const record: DiscordRecord = {
      id: createId("discord"),
      officerId: input.officerId,
      year: input.year,
      month: input.month,
      week: input.week,
      activityType: input.activityType,
      quantity: input.quantity,
      discordUrl: normalizedUrl,
      note: input.note,
      status: "Pendente",
      submittedBy: access.userId,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: "",
      approvalApplied: false,
      createdAt: new Date().toISOString()
    };

    records.unshift(record);
    writeLocal(KEYS.discordRecords, records);
    appendDemoAudit(
      "discord_records",
      record.id,
      "INSERT",
      null,
      record as unknown as Record<string, unknown>
    );
    return { record, entry: null };
  }

  const { data, error } = await getSupabaseClient().rpc(
    "save_discord_record",
    {
      p_officer_id: input.officerId,
      p_year: input.year,
      p_month: input.month,
      p_week: input.week,
      p_activity_type: input.activityType,
      p_quantity: input.quantity,
      p_discord_url: normalizedUrl,
      p_note: input.note
    }
  );

  if (error) {
    if (
      error.message.toLowerCase().includes("já foi utilizado") ||
      error.code === "23505"
    ) {
      throw new Error("Este link do Discord já foi utilizado.");
    }

    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "Execute primeiro a atualização V0.4 no SQL Editor do Supabase."
      );
    }

    throw new Error(error.message);
  }

  return mapDiscordRpcResult(data);
}

export async function saveDiscordRecordsBatch(
  inputs: DiscordRecordInput[]
): Promise<DiscordRecordSaveResult[]> {
  if (inputs.length === 0) {
    throw new Error("Adicione pelo menos um registro ao lote.");
  }

  if (inputs.length > 50) {
    throw new Error("O lote pode ter no máximo 50 registros.");
  }

  const normalizedInputs = inputs.map((input) => ({
    ...input,
    discordUrl: normalizeDiscordMessageUrl(input.discordUrl),
    note: input.note.trim()
  }));

  normalizedInputs.forEach((input) => {
    if (!input.officerId) {
      throw new Error("Todos os registros precisam de um integrante.");
    }

    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new Error("Todas as quantidades precisam ser pelo menos 1.");
    }
  });

  const uniqueUrls = new Set(normalizedInputs.map((input) => input.discordUrl));
  if (uniqueUrls.size !== normalizedInputs.length) {
    throw new Error("Existem links repetidos dentro do lote.");
  }

  if (isDemoMode) {
    const records = await loadDiscordRecords();
    const existingUrls = new Set(records.map((record) => record.discordUrl));

    if (normalizedInputs.some((input) => existingUrls.has(input.discordUrl))) {
      throw new Error("Um ou mais links do lote já foram utilizados.");
    }

    const access = (await loadCurrentUserAccess()) ?? demoAccess();
    const results = normalizedInputs.map((input) => {
      const record: DiscordRecord = {
        id: createId("discord"),
        officerId: input.officerId,
        year: input.year,
        month: input.month,
        week: input.week,
        activityType: input.activityType,
        quantity: input.quantity,
        discordUrl: input.discordUrl,
        note: input.note,
        status: "Pendente",
        submittedBy: access.userId,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: "",
        approvalApplied: false,
        createdAt: new Date().toISOString()
      };
      records.unshift(record);
      appendDemoAudit(
        "discord_records",
        record.id,
        "INSERT",
        null,
        record as unknown as Record<string, unknown>
      );
      return { record, entry: null } satisfies DiscordRecordSaveResult;
    });

    writeLocal(KEYS.discordRecords, records);
    return results;
  }

  const payload = normalizedInputs.map((input) => ({
    officer_id: input.officerId,
    year: input.year,
    month: input.month,
    week: input.week,
    activity_type: input.activityType,
    quantity: input.quantity,
    discord_url: input.discordUrl,
    note: input.note
  }));

  const { data, error } = await getSupabaseClient().rpc(
    "save_discord_records_batch",
    { p_records: payload }
  );

  if (error) {
    if (
      error.message.toLowerCase().includes("já foi utilizado") ||
      error.message.toLowerCase().includes("links repetidos") ||
      error.code === "23505"
    ) {
      throw new Error("Um ou mais links do lote já foram utilizados.");
    }

    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "Execute primeiro a atualização V0.4 no SQL Editor do Supabase."
      );
    }

    throw new Error(error.message);
  }

  if (!Array.isArray(data)) {
    throw new Error("O banco retornou uma resposta inválida para o lote.");
  }

  return data.map((item) => mapDiscordRpcResult(item));
}

export async function reviewDiscordRecord(
  id: string,
  decision: "Aprovar" | "Rejeitar",
  reason = ""
): Promise<DiscordRecordSaveResult> {
  if (isDemoMode) {
    const records = await loadDiscordRecords();
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Registro do Discord não encontrado.");
    if (records[index].status !== "Pendente") {
      throw new Error("Este registro já foi analisado.");
    }

    const access = (await loadCurrentUserAccess()) ?? demoAccess();
    const previousRecord = { ...records[index] };
    const reviewedAt = new Date().toISOString();
    let entry: WeeklyEntry | null = null;

    if (decision === "Aprovar") {
      const entries = await loadEntries();
      const record = records[index];
      const entryIndex = entries.findIndex(
        (item) =>
          item.officerId === record.officerId &&
          item.year === record.year &&
          item.month === record.month &&
          item.week === record.week
      );
      const current = entryIndex >= 0 ? entries[entryIndex] : {
        id: createId("entry"),
        officerId: record.officerId,
        year: record.year,
        month: record.month,
        week: record.week,
        prisons: 0,
        pursuits: 0,
        note: "",
        createdAt: reviewedAt
      };
      entry = {
        ...current,
        prisons: current.prisons + (record.activityType === "Prisão" ? record.quantity : 0),
        pursuits: current.pursuits + (record.activityType === "Acompanhamento" ? record.quantity : 0)
      };
      if (entryIndex >= 0) entries[entryIndex] = entry;
      else entries.unshift(entry);
      writeLocal(KEYS.entries, entries);
      appendDemoAudit(
        "weekly_entries",
        entry.id,
        entryIndex >= 0 ? "UPDATE" : "INSERT",
        entryIndex >= 0
          ? (current as unknown as Record<string, unknown>)
          : null,
        entry as unknown as Record<string, unknown>
      );
    }

    records[index] = {
      ...records[index],
      status: decision === "Aprovar" ? "Aprovado" : "Rejeitado",
      reviewedBy: access.userId,
      reviewedAt,
      rejectionReason: decision === "Rejeitar" ? reason.trim() : "",
      approvalApplied: decision === "Aprovar"
    };
    writeLocal(KEYS.discordRecords, records);
    appendDemoAudit(
      "discord_records",
      records[index].id,
      "UPDATE",
      previousRecord as unknown as Record<string, unknown>,
      records[index] as unknown as Record<string, unknown>
    );
    return { record: records[index], entry };
  }

  const { data, error } = await getSupabaseClient().rpc(
    "review_discord_record",
    {
      p_record_id: id,
      p_decision: decision,
      p_reason: reason.trim()
    }
  );

  if (error) throw new Error(error.message);
  return mapDiscordRpcResult(data);
}

export async function deleteDiscordRecord(
  id: string
): Promise<DiscordRecordSaveResult> {
  if (isDemoMode) {
    const records = await loadDiscordRecords();
    const record = records.find((item) => item.id === id);
    if (!record) throw new Error("Registro do Discord não encontrado.");

    let entry: WeeklyEntry | null = null;
    if (record.status === "Aprovado" && record.approvalApplied) {
      const entries = await loadEntries();
      const entryIndex = entries.findIndex(
        (item) =>
          item.officerId === record.officerId &&
          item.year === record.year &&
          item.month === record.month &&
          item.week === record.week
      );
      if (entryIndex >= 0) {
        const current = entries[entryIndex];
        entry = {
          ...current,
          prisons: record.activityType === "Prisão"
            ? Math.max(0, current.prisons - record.quantity)
            : current.prisons,
          pursuits: record.activityType === "Acompanhamento"
            ? Math.max(0, current.pursuits - record.quantity)
            : current.pursuits
        };
        entries[entryIndex] = entry;
        writeLocal(KEYS.entries, entries);
        appendDemoAudit(
          "weekly_entries",
          entry.id,
          "UPDATE",
          current as unknown as Record<string, unknown>,
          entry as unknown as Record<string, unknown>
        );
      }
    }

    writeLocal(
      KEYS.discordRecords,
      records.filter((item) => item.id !== id)
    );
    appendDemoAudit(
      "discord_records",
      record.id,
      "DELETE",
      record as unknown as Record<string, unknown>,
      null
    );
    return { record, entry };
  }

  const { data, error } = await getSupabaseClient().rpc(
    "delete_discord_record_secure",
    {
      p_record_id: id,
      p_confirmation: "EXCLUIR"
    }
  );

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "Execute primeiro a atualização V0.5 no SQL Editor do Supabase."
      );
    }
    throw new Error(error.message);
  }
  return mapDiscordRpcResult(data);
}

export async function deleteEntry(id: string) {
  if (isDemoMode) {
    const entries = await loadEntries();
    const entry = entries.find((item) => item.id === id);
    writeLocal(
      KEYS.entries,
      entries.filter((item) => item.id !== id)
    );
    if (entry) {
      appendDemoAudit(
        "weekly_entries",
        entry.id,
        "DELETE",
        entry as unknown as Record<string, unknown>,
        null
      );
    }
    return;
  }

  const { error } = await getSupabaseClient().rpc("delete_weekly_entry", {
    p_entry_id: id,
    p_confirmation: "EXCLUIR"
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "Execute primeiro a atualização V0.5 no SQL Editor do Supabase."
      );
    }
    throw new Error(error.message);
  }
}

export async function loadClosures(): Promise<MonthClosure[]> {
  if (isDemoMode) {
    return readLocal<MonthClosure[]>(KEYS.closures, []);
  }

  const { data, error } = await getSupabaseClient()
    .from("monthly_closures")
    .select("id, year, month, snapshot, integrity_hash, closed_at")
    .order("closed_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    year: row.year,
    month: row.month,
    snapshot: row.snapshot,
    integrityHash: row.integrity_hash,
    closedAt: row.closed_at
  }));
}

export async function closeMonth(
  year: number,
  month: number,
  officers: Officer[],
  entries: WeeklyEntry[]
): Promise<MonthClosure> {
  if (isDemoMode) {
    const snapshot = {
      officers,
      entries: entries.filter(
        (item) => item.year === year && item.month === month
      ),
      discordRecords: (await loadDiscordRecords()).filter(
        (item) => item.year === year && item.month === month
      )
    };

    const closure: MonthClosure = {
      id: createId("closure"),
      year,
      month,
      snapshot,
      integrityHash: `demo-${Date.now().toString(36)}`,
      closedAt: new Date().toISOString()
    };

    const closures = await loadClosures();
    const previous = closures.find(
      (item) => item.year === year && item.month === month
    );
    const filtered = closures.filter(
      (item) => !(item.year === year && item.month === month)
    );
    filtered.unshift(closure);
    writeLocal(KEYS.closures, filtered);
    appendDemoAudit(
      "monthly_closures",
      closure.id,
      previous ? "UPDATE" : "INSERT",
      previous
        ? (previous as unknown as Record<string, unknown>)
        : null,
      closure as unknown as Record<string, unknown>
    );
    return closure;
  }

  const { data, error } = await getSupabaseClient().rpc("close_month_secure", {
    p_year: year,
    p_month: month,
    p_confirmation: "FECHAR"
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "Execute primeiro a atualização V0.5 no SQL Editor do Supabase."
      );
    }
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    snapshot: row.snapshot,
    integrityHash: row.integrity_hash,
    closedAt: row.closed_at
  };
}
