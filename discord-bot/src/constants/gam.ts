export const GAM_ACTIVITY = {
  PRISON: "PRISAO",
  PURSUIT: "ACOMPANHAMENTO",
} as const;

export const GAM_FIELDS = {
  META: "META:",
  QRU: "QRU:",
  DATE: "DATA:",
} as const;

export const REQUIRED_FIELDS = [
  GAM_FIELDS.META,
  GAM_FIELDS.QRU,
  GAM_FIELDS.DATE,
] as const;