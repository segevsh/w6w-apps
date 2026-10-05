import type { HookContext } from "@w6w/types";

/**
 * Bitwarden Public API client (organization management).
 *
 * Verified 2026-10-05 against the live OpenAPI 3.0.4 document embedded in
 * `bitwarden.com/help/api/` (16 paths, 28 operations, `info.version` "latest")
 * and live probes of `identity.bitwarden.{com,eu}` and `api.bitwarden.{com,eu}`.
 *
 * ## Two hosts per region, and no others
 *
 * The document declares two servers (`api.bitwarden.com` US, `api.bitwarden.eu`
 * EU) and three OAuth token URLs — the third is a Gov cloud
 * (`identity.bitwarden-gov.com`) with no matching API server, so Gov is left
 * out rather than guessed. A self-hosted server is `https://your.domain/api`
 * with identity under `/identity`; that is an arbitrary host a manifest cannot
 * allowlist without `"*"`, so it is out of scope.
 *
 * ## Response shapes
 *
 *  - Lists: `{"object":"list","data":[…]}`. Events add `continuationToken`.
 *  - Singles: the resource itself with `"object":"<type>"` — no `data` envelope.
 *  - DELETE and the `…/group-ids` / `…/member-ids` PUTs answer an **empty 200**.
 *  - Errors: `{"object":"error","message":…,"errors":{field:[…]}}` on 400, and an
 *    empty body on 401/404.
 *  - The document declares responses as `text/json`; the body is plain JSON.
 */

export type Region = "us" | "eu";

export const REGIONS: Record<Region, { label: string; api: string; identity: string }> = {
  us: {
    label: "US cloud",
    api: "https://api.bitwarden.com",
    identity: "https://identity.bitwarden.com",
  },
  eu: {
    label: "EU cloud",
    api: "https://api.bitwarden.eu",
    identity: "https://identity.bitwarden.eu",
  },
};

export const DEFAULT_REGION: Region = "us";

/** Narrow anything a connection or form hands back to a known region. */
export function normalizeRegion(value: unknown): Region {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "") return DEFAULT_REGION;
  if (v === "us" || v === "eu") return v;
  throw new Error(`\`region\` must be "us" or "eu" — got ${JSON.stringify(v.slice(0, 20))}`);
}

export function regionFromConnection(connection: unknown): Region {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  return normalizeRegion(display?.region);
}

export const ORG_TYPE_NAMES: Record<number, string> = {
  0: "Owner",
  1: "Admin",
  2: "User",
  4: "Custom",
};

export const MEMBER_STATUS_NAMES: Record<number, string> = {
  [-1]: "Revoked",
  0: "Invited",
  1: "Accepted",
  2: "Confirmed",
  3: "Staged",
};

export const POLICY_TYPE_NAMES: Record<number, string> = {
  0: "TwoFactorAuthentication",
  1: "MasterPassword",
  2: "PasswordGenerator",
  3: "SingleOrg",
  4: "RequireSso",
  5: "OrganizationDataOwnership",
  6: "DisableSend",
  7: "SendOptions",
  8: "ResetPassword",
  9: "MaximumVaultTimeout",
  10: "DisablePersonalVaultExport",
  11: "ActivateAutofill",
  12: "AutomaticAppLogIn",
  13: "FreeFamiliesSponsorshipPolicy",
  14: "RemoveUnlockWithPin",
  15: "RestrictedItemTypesPolicy",
  16: "UriMatchDefaults",
  17: "AutotypeDefaultSetting",
  18: "AutomaticUserConfirmation",
  19: "BlockClaimedDomainAccountCreation",
  20: "OrganizationUserNotification",
  21: "SendControls",
  22: "FillAssist",
};

export type QueryValue = string | number | boolean | undefined | null;

/** Drop keys the caller left unset. `false` and `0` survive. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** A list param given as an array or a comma/newline separated string. */
export function list(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Accept a `json` param as a parsed value or the string a user typed. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: unknown, field: string): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${field}\` is required`);
  if (!UUID_RE.test(id)) {
    throw new Error(
      `\`${field}\` must be a UUID — got ${JSON.stringify(id.slice(0, 40))}. Bitwarden ids are ` +
        "UUIDs; a member's `id` (organization-scoped) is not their `userId` (account-wide)",
    );
  }
  return id.toLowerCase();
}

export function optionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  return assertUuid(value, field);
}

export function uuidList(value: unknown, field: string): string[] {
  return (list(value) ?? []).map((id) => assertUuid(id, field));
}

/** ISO 8601 date-time param → normalised ISO string, or undefined when unset. */
export function isoDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  const ms = Date.parse(String(value));
  if (Number.isNaN(ms)) {
    throw new Error(`\`${field}\` must be an ISO 8601 date-time, e.g. 2026-10-01T00:00:00Z`);
  }
  return new Date(ms).toISOString();
}

/** Integer enum param: accepts a number or numeric string, rejects anything off-list. */
export function intEnum(
  value: unknown,
  field: string,
  allowed: Record<number, string>,
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || !(n in allowed)) {
    throw new Error(
      `\`${field}\` must be one of ${
        Object.entries(allowed).map(([k, v]) => `${k} (${v})`).join(", ")
      } — got ${JSON.stringify(String(value).slice(0, 20))}`,
    );
  }
  return n;
}

/** Map an `associations` param ([{id, readOnly, hidePasswords?, manage?}]) onto the wire shape. */
export function associations(value: unknown, field: string): unknown[] | undefined {
  const parsed = json(value, field);
  if (parsed === undefined) return undefined;
  if (!Array.isArray(parsed)) throw new Error(`\`${field}\` must be a JSON array`);
  return parsed.map((raw, i) => {
    const a = raw as Record<string, unknown>;
    if (!a || typeof a !== "object") throw new Error(`\`${field}[${i}]\` must be an object`);
    return compact({
      id: assertUuid(a.id, `${field}[${i}].id`),
      // `readOnly` is REQUIRED by the schema, so default it rather than omit it.
      readOnly: a.readOnly === undefined ? false : Boolean(a.readOnly),
      hidePasswords: a.hidePasswords === undefined ? undefined : Boolean(a.hidePasswords),
      manage: a.manage === undefined ? undefined : Boolean(a.manage),
    });
  });
}

/** Turn a failed response into a message that says which of the failure modes it was. */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      message?: string;
      errors?: Record<string, string[]>;
      error?: string;
      error_description?: string;
    };
    const fields = body?.errors
      ? Object.entries(body.errors).map(([k, v]) => `${k}: ${[v].flat().join(", ")}`).join("; ")
      : "";
    detail = [body?.message ?? body?.error_description ?? body?.error, fields]
      .filter(Boolean).join(" — ") || detail;
  } catch { /* empty or not JSON */ }

  if (status === 401) {
    return `${detail || "unauthorized"} — the bearer token was missing, invalid or expired. ` +
      "Tokens last 60 minutes and the runtime mints a new one from the organization API key; " +
      "a persistent 401 means the key was rotated, or this region's host does not match where " +
      "the organization lives (US and EU are separate stacks)";
  }
  if (status === 404) {
    return `${detail || "not found"} — Bitwarden answers 404 with an empty body, so a wrong id, ` +
      "an id from another organization and a deleted record look identical";
  }
  if (status === 429) {
    return `${detail || "too many requests"} — Bitwarden rate-limits per organization; back off`;
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

export class BitwardenClient {
  private base: string;

  constructor(private ctx: HookContext, region?: Region) {
    this.base = REGIONS[region ?? regionFromConnection(ctx.connection)].api;
  }

  /** Returns the parsed body, or `null` for the empty 200 that DELETE and the id-list PUTs give. */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}/public${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`Bitwarden ${res.status}: ${describeError(res.status, text)}`);
    }
    if (!text.trim()) return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Bitwarden returned a non-JSON body: ${text.slice(0, 160)}`);
    }
  }
}
