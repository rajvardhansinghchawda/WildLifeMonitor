import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatHectares(ha: number): string {
  if (ha >= 1000) {
    return `${(ha / 100).toFixed(1)} km² (${ha.toLocaleString()} ha)`;
  }
  return `${ha.toLocaleString()} ha`;
}
