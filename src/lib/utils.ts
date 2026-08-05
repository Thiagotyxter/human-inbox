import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isTruthy<T>(value: T | null | undefined | false): value is T {
  return Boolean(value);
}

export function formatPhone(phone: string) {
  return phone;
}

export function previewText(value: string | null | undefined, fallback = "Sem conteúdo de texto") {
  if (!value) {
    return fallback;
  }

  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}
