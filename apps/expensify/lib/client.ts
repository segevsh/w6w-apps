import type { HookContext } from "@w6w/types";

/**
 * Thin client for the Expensify Integration Server.
 *
 * Verified 2026-10-06 against https://integrations.expensify.com/Integration-Server/doc/
 * (plus `/doc/employeeUpdater/`) and live probes of the endpoint:
 *
 *  - There is ONE endpoint. Every operation is a form-encoded POST whose
 *    `requestJobDescription` field is a JSON document `{type, credentials, inputSettings, …}`.
 *    Extra form fields carry large payloads (`template`, `data`).
 *  - The credentials live INSIDE that JSON. Actions never write them: {@link buildBody} emits a
 *    job with no `credentials` key and the Auth `sign` hook merges them in (see auth/partner.ts).
 *  - HTTP status is not the verdict. Measured live: a bad credential pair, a missing
 *    `requestJobDescription` and an unknown job type are ALL `HTTP 200` with a JSON body
 *    `{"responseMessage": "...", "responseCode": 404|500|403}`. The body's `responseCode` decides.
 *    Documented codes: 200 ok, 207 partial success (report status updater), 403 permission,
 *    404 not found / authentication, 410 validation, 500 generic, 429 rate limited.
 *  - Rate limits: 5 requests per 10 seconds, 20 per 60 seconds.
 */
export const HOST = "integrations.expensify.com";
export const ENDPOINT = `https://${HOST}/Integration-Server/ExpensifyIntegrations`;

export class ExpensifyError extends Error {
  constructor(
    message: string,
    readonly code: number | undefined,
    readonly vendorMessage: string,
  ) {
    super(message);
    this.name = "ExpensifyError";
  }
}

/** A job description, without credentials. */
export interface Job {
  type: string;
  [key: string]: unknown;
}

/** Drop `undefined`, `null` and empty-string values; keep `false` and `0`. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** A `json` param may arrive parsed or as the text the user typed. */
export function jsonValue(name: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/** Parse a `json` param that must be a non-empty array of objects. */
export function objectList(name: string, value: unknown): Record<string, unknown>[] {
  const v = jsonValue(name, value);
  if (!Array.isArray(v) || v.length === 0) {
    throw new Error(`${name} must be a non-empty JSON array`);
  }
  for (const [i, item] of v.entries()) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${name}[${i}] must be an object`);
    }
  }
  return v as Record<string, unknown>[];
}

/** A list given as an array or as comma/newline separated text. */
export function strArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  const parts = Array.isArray(value) ? value : String(value).split(/[,\n]/);
  return parts.map((s) => String(s).trim()).filter((s) => s !== "");
}

/** The comma-joined form several filters use (`reportIDList: "R1,R2"`). */
export function csv(value: unknown): string | undefined {
  const list = strArray(value);
  return list.length > 0 ? list.join(",") : undefined;
}

export function requiredText(name: string, value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${name} is required`);
  return s;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Expensify wants `yyyy-mm-dd` everywhere; anything else is a 410 after a round trip. */
export function dateText(name: string, value: unknown, required = false): string | undefined {
  const s = String(value ?? "").trim();
  if (!s) {
    if (required) throw new Error(`${name} is required`);
    return undefined;
  }
  if (!DATE.test(s)) throw new Error(`${name} must be formatted yyyy-mm-dd`);
  return s;
}

/** Build the form body: the job (no credentials) plus any extra form fields. */
export function buildBody(job: Job, extra: Record<string, string | undefined> = {}): string {
  const form = new URLSearchParams();
  form.set("requestJobDescription", JSON.stringify(job));
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== "") form.set(k, v);
  }
  return form.toString();
}

export interface VendorResponse {
  responseCode?: number;
  responseMessage?: string;
  [key: string]: unknown;
}

/** Read `{responseCode, responseMessage}` out of a body, or `null` if it is not that envelope. */
export function envelope(text: string): VendorResponse | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as VendorResponse;
    }
  } catch { /* not JSON */ }
  return null;
}

function fail(what: string, status: number, body: VendorResponse | null, text: string): never {
  const vendor = body?.responseMessage ?? text.trim().slice(0, 200);
  const code = typeof body?.responseCode === "number" ? body.responseCode : status;
  throw new ExpensifyError(
    `Expensify ${what} failed (${code})${vendor ? `: ${vendor}` : ""}`,
    code,
    vendor,
  );
}

async function post(ctx: HookContext, job: Job, extra?: Record<string, string | undefined>) {
  const res = await ctx.fetch(ENDPOINT, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: buildBody(job, extra),
  });
  return res;
}

/**
 * Run a job that answers a JSON envelope. Throws on any `responseCode` other than 200
 * (and 207 when `partialOk`). The returned object still carries `responseCode`.
 */
export async function runJob(
  ctx: HookContext,
  job: Job,
  extra?: Record<string, string | undefined>,
  opts: { partialOk?: boolean } = {},
): Promise<VendorResponse> {
  const what = `${job.type} job`;
  const res = await post(ctx, job, extra);
  const text = await res.text();
  const body = envelope(text);
  const accepted = opts.partialOk ? [200, 207] : [200];
  if (!res.ok || !body || typeof body.responseCode !== "number") {
    return fail(what, res.status, body, text);
  }
  if (!accepted.includes(body.responseCode)) return fail(what, res.status, body, text);
  return body;
}

/**
 * Run a job that answers with a generated FILE NAME (`returnRandomFileName` export and the
 * reconciliation job). The reference documents the success body only as "the name of the
 * generated report" (reconciliation: `{filename, responseMessage, responseCode}`), so both a JSON
 * envelope and a bare-text name are accepted; an envelope with a non-200 code is an error.
 */
export async function runFileJob(
  ctx: HookContext,
  job: Job,
  extra?: Record<string, string | undefined>,
): Promise<string> {
  const what = `${job.type} job`;
  const res = await post(ctx, job, extra);
  const text = await res.text();
  const body = envelope(text);
  if (!res.ok) return fail(what, res.status, body, text);
  if (body) {
    if (typeof body.responseCode === "number" && body.responseCode !== 200) {
      return fail(what, res.status, body, text);
    }
    const name = body.filename ?? body.fileName;
    if (typeof name === "string" && name) return name;
    return fail(what, res.status, { responseMessage: "response named no file" }, text);
  }
  const name = text.trim().replace(/^"|"$/g, "");
  if (!name) return fail(what, res.status, null, "empty response");
  return name;
}

/** `onFinish` email action. */
export function emailAction(recipients: unknown, message?: unknown) {
  const to = csv(recipients);
  if (!to) return undefined;
  return compact({ actionName: "email", recipients: to, message: message as string | undefined });
}

/** Plain values as select options. */
export function opts(values: string[]): { value: string; label: string }[] {
  return values.map((v) => ({ value: v, label: v }));
}
