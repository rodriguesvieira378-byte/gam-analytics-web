"use client";

import type {
  SelectHTMLAttributes
} from "react";

import styles from "./Select.module.css";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "children"
  > {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
}

export function Select({
  label,
  helperText,
  error,
  options,
  className = "",
  id,
  ...props
}: SelectProps) {
  const fieldId =
    id ??
    `select-${
      label
        ?.toLowerCase()
        .replace(/\s+/g, "-") ?? "field"
    }`;

  return (
    <label
      className={[
        styles.field,
        className
      ]
        .filter(Boolean)
        .join(" ")}
      htmlFor={fieldId}
    >
      {label && (
        <span className={styles.label}>
          {label}
        </span>
      )}

      <select
        id={fieldId}
        className={[
          styles.select,
          error ? styles.invalid : ""
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {options.map((option) => (
          <option
            key={String(option.value)}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <small className={styles.error}>
          {error}
        </small>
      ) : helperText ? (
        <small className={styles.helper}>
          {helperText}
        </small>
      ) : null}
    </label>
  );
}