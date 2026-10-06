import type { ActionDefinition, HookContext, Param } from "@w6w/types";

/** Every endpoint hangs off this host; there is no version segment in the path. */
export const API_URL = "https://api.prospeo.io";

/** Prospeo's error body: `{ error: true, error_code, filter_error? }`. */
export interface ErrorBody {
  error?: boolean;
  error_code?: string;
  filter_error?: string;
}

/** Codes that mean "nothing matched", a normal outcome rather than a failure. */
export const NO_RESULT_CODES = ["NO_MATCH", "NO_RESULTS"];

/**
 * Prospeo answers EVERY error, including a bad API key, an empty search and a rate limit
 * body, as `{ error: true, error_code }`; and a business error such as `NO_MATCH` or
 * `INVALID_API_KEY` is HTTP 400, not 404/401. The verdict is therefore the body's
 * `error_code`, never the status.
 */
export function describeError(status: number, body: ErrorBody | null, raw: string): string {
  if (!body || typeof body !== "object") return raw.slice(0, 300) || `HTTP ${status}`;
  const code = body.error_code ?? `HTTP ${status}`;
  return body.filter_error ? `${code}: ${body.filter_error}` : code;
}

export interface CallOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Error codes to hand back as a normal result (`{ error: true, error_code }`). */
  soft?: string[];
}

export class ProspeoClient {
  constructor(private ctx: HookContext) {}

  async call<T = Record<string, unknown>>(path: string, options: CallOptions = {}): Promise<T> {
    const method = options.method ?? "POST";
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(`${API_URL}${path}`, init);
    const raw = await res.text().catch(() => "");
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: reported below */ }
    const body = parsed as (ErrorBody & Record<string, unknown>) | null;

    if (body?.error === true && body.error_code && options.soft?.includes(body.error_code)) {
      return body as T;
    }
    if (!res.ok || body === null || body.error === true) {
      const retry = res.headers.get("x-minute-reset-seconds");
      const tail = res.status === 429 && retry ? ` (minute window resets in ${retry}s)` : "";
      throw new Error(
        `Prospeo ${res.status} for ${method} ${path}: ${
          describeError(res.status, body, raw)
        }${tail}`,
      );
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

// --- Shared params ---------------------------------------------------------

export const ENRICH_FLAGS: Param[] = [
  {
    key: "onlyVerifiedEmail",
    label: "Only verified email",
    type: "boolean",
    hint: "Return a record only if its email status is VERIFIED. Default false.",
  },
  {
    key: "enrichMobile",
    label: "Enrich mobile",
    type: "boolean",
    hint: "Also reveal the mobile number if one exists. Costs 10 credits per mobile found.",
  },
  {
    key: "onlyVerifiedMobile",
    label: "Only verified mobile",
    type: "boolean",
    hint: "Return a record only if it has a VERIFIED mobile. Implies Enrich mobile.",
  },
];

export interface EnrichFlags {
  onlyVerifiedEmail?: boolean;
  enrichMobile?: boolean;
  onlyVerifiedMobile?: boolean;
}

export function enrichFlags(input: EnrichFlags): Record<string, unknown> {
  return compact({
    only_verified_email: input.onlyVerifiedEmail,
    enrich_mobile: input.enrichMobile,
    only_verified_mobile: input.onlyVerifiedMobile,
  });
}

const str = (key: string, label: string, hint?: string, placeholder?: string): Param => ({
  key,
  label,
  type: "string",
  hint,
  placeholder,
});

export const PERSON_FIELDS: Param[] = [
  str("firstName", "First name", "Needs a last name and a company field to match.", "Roger"),
  str("lastName", "Last name", undefined, "Sterling"),
  str("fullName", "Full name", "Needs a company field to match.", "Roger Sterling"),
  str("linkedinUrl", "LinkedIn URL", "Matches on its own."),
  str("email", "Work email", "Matches on its own.", "roger.sterling@deloitte.com"),
  str("companyName", "Company name", "Weakest company signal; prefer the website.", "Deloitte"),
  str("companyWebsite", "Company website", "The most reliable company signal.", "deloitte.com"),
  str("companyLinkedinUrl", "Company LinkedIn URL", undefined),
  str("personId", "Person ID", "A `person_id` from Search Person. Matches on its own."),
];

export const COMPANY_FIELDS: Param[] = [
  str("companyWebsite", "Company website", "The most reliable signal.", "deloitte.com"),
  str("companyLinkedinUrl", "Company LinkedIn URL", undefined),
  str("companyName", "Company name", "Discouraged on its own: names collide.", "Deloitte"),
  str("companyId", "Company ID", "A `company_id` from a previously returned company object."),
];

export interface PersonInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  linkedinUrl?: string;
  email?: string;
  companyName?: string;
  companyWebsite?: string;
  companyLinkedinUrl?: string;
  personId?: string;
}

export interface CompanyInput {
  companyWebsite?: string;
  companyLinkedinUrl?: string;
  companyName?: string;
  companyId?: string;
}

export function personData(i: PersonInput): Record<string, unknown> {
  return compact({
    first_name: i.firstName,
    last_name: i.lastName,
    full_name: i.fullName,
    linkedin_url: i.linkedinUrl,
    email: i.email,
    company_name: i.companyName,
    company_website: i.companyWebsite,
    company_linkedin_url: i.companyLinkedinUrl,
    person_id: i.personId,
  });
}

export function companyData(i: CompanyInput): Record<string, unknown> {
  return compact({
    company_website: i.companyWebsite,
    company_linkedin_url: i.companyLinkedinUrl,
    company_name: i.companyName,
    company_id: i.companyId,
  });
}

/** Bulk endpoints take at most 50 records, each with a caller-chosen `identifier`. */
export function bulkRecords(value: unknown): Record<string, unknown>[] {
  const data = parseJson(value, "records");
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("records must be a non-empty array of objects");
  }
  if (data.length > 50) throw new Error(`records holds ${data.length} items; the limit is 50`);
  data.forEach((r, i) => {
    const id = (r as { identifier?: unknown } | null)?.identifier;
    if (typeof id !== "string" || id === "") {
      throw new Error(`records[${i}] needs a string "identifier"`);
    }
  });
  return data as Record<string, unknown>[];
}

export type Action<I> = ActionDefinition<I>;
