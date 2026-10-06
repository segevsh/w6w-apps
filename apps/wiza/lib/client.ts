import type { HookContext } from "@w6w/types";

/** Every endpoint is `https://wiza.co/api/...` — the marketing site and the API share a host. */
export const API_URL = "https://wiza.co";

/**
 * Wiza's error envelope is `{ status: { code, message } }`, except the "list not found" and
 * "continue search: not found" bodies, which flatten it to `{ status: 404, message }`.
 */
export interface WizaBody {
  status?: { code?: number; message?: string } | number;
  message?: string;
  [key: string]: unknown;
}

/** The vendor's own message, whichever of the two envelope shapes carried it. */
export function messageOf(body: WizaBody | null): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  if (body.status && typeof body.status === "object" && body.status.message) {
    return body.status.message;
  }
  return typeof body.message === "string" ? body.message : undefined;
}

/** The vendor's own code: `status.code`, or the flat `status` number. */
export function codeOf(body: WizaBody | null): number | undefined {
  if (!body || typeof body !== "object") return undefined;
  if (typeof body.status === "number") return body.status;
  return body.status?.code;
}

export interface CallOptions {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | undefined>;
}

export class WizaClient {
  constructor(private ctx: HookContext) {}

  async call<T = WizaBody>(path: string, options: CallOptions = {}): Promise<T> {
    const method = options.method ?? (options.body === undefined ? "GET" : "POST");
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v !== undefined && v !== "") qs.set(k, v);
    }
    const url = `${API_URL}${path}${qs.size > 0 ? `?${qs}` : ""}`;

    const res = await this.ctx.fetch(url, init);
    const raw = await res.text().catch(() => "");
    let body: WizaBody | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: reported below */ }

    if (!res.ok || body === null || typeof body !== "object") {
      const detail = messageOf(body) ?? (raw.slice(0, 200) || `HTTP ${res.status}`);
      throw new Error(`Wiza ${res.status} for ${method} ${path}: ${detail}`);
    }
    return body as T;
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

/** Accept a JSON value, or a string holding JSON, for a `json` param. */
export function parseJson(value: unknown, what: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${what} is not valid JSON`);
  }
}

export function requireObject(value: unknown, what: string): Record<string, unknown> {
  const v = parseJson(value, what);
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`${what} must be an object`);
  return v as Record<string, unknown>;
}

/** The `data` member of an envelope, or `{}`. */
export function dataOf(body: WizaBody): Record<string, unknown> {
  const d = body.data;
  return d && typeof d === "object" && !Array.isArray(d) ? d as Record<string, unknown> : {};
}

export const ENRICHMENT_OPTIONS = [
  { value: "none", label: "None — profile details only" },
  { value: "partial", label: "Partial — find emails" },
  { value: "full", label: "Full — find emails and phone numbers" },
];

export interface EmailOptionsInput {
  acceptWork?: boolean;
  acceptPersonal?: boolean;
  acceptGeneric?: boolean;
}

/** `email_options` from the three flags; unset flags are left out so the API default applies. */
export function emailOptions(i: EmailOptionsInput): Record<string, boolean> | undefined {
  const out: Record<string, boolean> = {};
  if (i.acceptWork !== undefined) out.accept_work = i.acceptWork;
  if (i.acceptPersonal !== undefined) out.accept_personal = i.acceptPersonal;
  if (i.acceptGeneric !== undefined) out.accept_generic = i.acceptGeneric;
  return Object.keys(out).length > 0 ? out : undefined;
}

export const EMAIL_OPTION_PARAMS = [
  {
    key: "acceptWork",
    label: "Accept work emails",
    type: "boolean" as const,
    hint: "Professional addresses, e.g. tim.cooke@apple.com.",
  },
  {
    key: "acceptPersonal",
    label: "Accept personal emails",
    type: "boolean" as const,
    hint: "e.g. tcooke1960@gmail.com. At least one of work or personal must be accepted.",
  },
];

export const GENERIC_EMAIL_PARAM = {
  key: "acceptGeneric",
  label: "Accept generic emails",
  type: "boolean" as const,
  hint: "e.g. hello@apple.com. Lists only; individual reveals have no generic option.",
};
