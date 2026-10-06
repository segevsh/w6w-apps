import type { HookContext } from "@w6w/types";

/** Every endpoint, speech and dubbing alike, lives on this host. */
export const API_URL = "https://api.murf.ai";

/** Murf's error envelope: `{ error_message, error_code }` (HTTP status mirrors `error_code`). */
export interface MurfError {
  error_message?: string;
  error_code?: number;
}

export function messageOf(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const m = (body as MurfError).error_message;
  return typeof m === "string" ? m.trim() : undefined;
}

export function codeOf(body: unknown): number | undefined {
  if (!body || typeof body !== "object") return undefined;
  const c = (body as MurfError).error_code;
  return typeof c === "number" ? c : undefined;
}

/** A text-only `multipart/form-data` body (`ctx.fetch` cannot carry a `FormData` object). */
export interface Multipart {
  body: string;
  contentType: string;
}

export function multipart(fields: Array<[string, string]>): Multipart {
  const boundary = `----w6wMurf${crypto.randomUUID().replace(/-/g, "")}`;
  const parts = fields.map(([name, value]) =>
    `--${boundary}\r\ncontent-disposition: form-data; name="${
      name.replace(/["\r\n]/g, "")
    }"\r\n\r\n${value}\r\n`
  );
  return {
    body: `${parts.join("")}--${boundary}--\r\n`,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export interface CallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Serialized as JSON. */
  body?: unknown;
  form?: Multipart;
  query?: Record<string, string | number | undefined>;
}

export class MurfClient {
  constructor(private ctx: HookContext) {}

  async call<T = Record<string, unknown>>(path: string, options: CallOptions = {}): Promise<T> {
    const method = options.method ?? (options.body !== undefined || options.form ? "POST" : "GET");
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.form) {
      headers["content-type"] = options.form.contentType;
      init.body = options.form.body;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    const url = `${API_URL}${path}${qs.size > 0 ? `?${qs}` : ""}`;

    const res = await this.ctx.fetch(url, init);
    const raw = await res.text().catch(() => "");
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: reported below */ }

    if (!res.ok || parsed === null || typeof parsed !== "object") {
      const detail = messageOf(parsed) ?? (raw.slice(0, 200) || `HTTP ${res.status}`);
      throw new Error(`Murf ${res.status} for ${method} ${path}: ${detail}`);
    }
    return parsed as T;
  }
}

/** Drop keys whose value is `undefined`, `null` or an empty string. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma/newline separated string (or pass an array through) into trimmed values. */
export function toList(value: unknown, what: string): string[] {
  const items = Array.isArray(value)
    ? value.map((v) => String(v))
    : typeof value === "string"
    ? value.split(/[,\n]/)
    : [];
  const out = items.map((s) => s.trim()).filter((s) => s.length > 0);
  if (out.length === 0) throw new Error(`${what} must list at least one value`);
  return out;
}

export const FORMAT_OPTIONS = ["MP3", "WAV", "FLAC", "ALAW", "ULAW", "PCM", "OGG"].map((v) => ({
  value: v,
  label: v,
}));
export const SAMPLE_RATE_OPTIONS = ["8000", "24000", "44100", "48000"].map((v) => ({
  value: v,
  label: `${v} Hz`,
}));
export const PRIORITY_OPTIONS = ["LOW", "NORMAL", "HIGH"].map((v) => ({ value: v, label: v }));
