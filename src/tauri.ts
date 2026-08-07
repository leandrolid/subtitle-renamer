import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export interface TauriError {
  code?: string;
  errorCode?: string;
  kind?: string;
  message?: string;
}

export function invokeCommand<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  if (payload === undefined) {
    return tauriInvoke<T>(command);
  }
  return tauriInvoke<T>(command, payload);
}

export function errorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as TauriError;
    return String(e.code ?? e.errorCode ?? e.kind ?? "").trim();
  }
  return "";
}
