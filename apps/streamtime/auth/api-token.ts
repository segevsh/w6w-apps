import type { AuthDefinition, HookContext } from "@w6w/types";
import { API_BASE, API_PREFIX, isNotAuthorised, truncate } from "../lib/client.ts";

/**
 * Streamtime bearer token — the "via App" credential.
 *
 * Verified against Streamtime's OpenAPI 3.1 document
 * (`components.securitySchemes.bearerAuth`: `type: http`, `scheme: bearer`,
 * fetched 2026-09-22 from `https://api.streamtime.net/swagger.json`) and live
 * probes of `api.streamtime.net` on the same day.
 *
 * ## Two ways to obtain a token; this app models one
 *
 * The vendor's own scheme description names both:
 *
 *  - **Via App** — "Tokens are obtained by the subscriber navigating to their
 *    Company Settings within the App and following the process to request a
 *    bearer token." This is the customer path, and it is the one modelled here:
 *    one opaque, long-lived token pasted into one secret field.
 *  - **Via OAuth** — "used for third parties who want to offer an integration
 *    between their product and any user of streamtime. If you want to connect
 *    via OAuth, get in touch with us…". That is the Streamtime Partner program
 *    and a registration decision made with the vendor, not a configuration a
 *    user can complete from a connection form, so no OAuth method is declared.
 *
 * ## The probe classifies from the BODY, not the status
 *
 * `GET /organisation` is the auth probe *and* the health check's credential
 * probe. It is the right call for three reasons:
 *
 *  1. **It requires a credential** — it is not one of the endpoints that
 *     answers without one.
 *  2. **It returns no credential material.** Success is the organisation's own
 *     record (`name`, `domain`, `currency`, `address`, `country`) — it never
 *     echoes the token, so a health report cannot copy a working credential
 *     into the health surface.
 *  3. **It distinguishes nothing by status code, so the body is the signal.**
 *     Measured live on 2026-09-22, all three of these return **byte-identical**
 *     `401`s carrying exactly `You are not authorised to make this request`
 *     (43 bytes, `text/html; charset=UTF-8`):
 *       - no `Authorization` header;
 *       - a syntactically plausible but invalid bearer token;
 *       - a path that does not exist (`GET /v2/definitely-not-a-path`).
 *     A missing token, a revoked token and a typo'd URL are therefore
 *     indistinguishable — which is why {@link readProbe} calls a rejection only
 *     when that exact body comes back, and treats a 200 carrying anything other
 *     than an `Organisation` as `unexpected` rather than guessing.
 */

export interface StreamtimeCredential {
  apiToken: string;
}

/** The organisation record returned on success (spec schema `Organisation`). */
export interface StreamtimeOrganisation {
  name?: string;
  domain?: string;
  currency?: { id?: string; name?: string; symbol?: string };
  address?: string;
  country?: { id?: string; name?: string };
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<StreamtimeCredential>): Record<string, string> {
  return { authorization: `Bearer ${(credential?.apiToken ?? "").trim()}` };
}

/** The probe path. `/organisation` — one call for the credential probe and its identity. */
export const PROBE_PATH = "/organisation";

export const PROBE_URL = `${API_BASE}${API_PREFIX}${PROBE_PATH}`;

/**
 * What the probe saw, before either caller turns it into a verdict.
 *
 * Deliberately four-valued rather than a boolean: `rejected` means Streamtime
 * said so in its own words, and `unexpected` means this app cannot tell — which
 * must never be reported as a dead credential, exactly as an unreadable status
 * feed must never be reported as an outage.
 */
export type ProbeReason = "accepted" | "rejected" | "unexpected";

export interface ProbeReading {
  reason: ProbeReason;
  status: number;
  /** Human explanation. Never contains the token. */
  detail: string;
  organisation?: StreamtimeOrganisation;
}

/**
 * Read a `GET /organisation` response the way Streamtime actually answers.
 *
 * `accepted` requires a 2xx **and** a JSON body shaped like an `Organisation`
 * (an object carrying a non-empty `name`). A 2xx of anything else is
 * `unexpected` — a proxy or a captive portal answering 200 is not a live
 * credential, and the pack's rule is that a 200 is not evidence of an endpoint,
 * let alone of a token.
 */
export async function readProbe(res: Response): Promise<ProbeReading> {
  const text = await res.text().catch(() => "");
  if (isNotAuthorised(text)) {
    return {
      reason: "rejected",
      status: res.status,
      detail: `Streamtime refused the request with its own message, "${text.trim()}", for ` +
        `${res.status}. Streamtime returns this same body for a missing token, an invalid ` +
        "token and a path that does not exist, so the token is the place to look first, then " +
        "the id or path.",
    };
  }

  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (res.ok) {
    const org = parsed as StreamtimeOrganisation | null;
    if (org && typeof org === "object" && typeof org.name === "string" && org.name.length > 0) {
      return { reason: "accepted", status: res.status, detail: org.name, organisation: org };
    }
    return {
      reason: "unexpected",
      status: res.status,
      detail: `${res.status} did not carry an Organisation record: ${truncate(text, 200)}`,
    };
  }

  return {
    reason: "unexpected",
    status: res.status,
    detail: `${res.status} with a body this app does not recognise: ${truncate(text, 200)}`,
  };
}

/**
 * Fetch the probe as the caller wants it.
 *
 * `headers` exists so the auth `test` hook — which holds the raw credential and
 * runs before any request is signed — can stamp its own bearer header, while
 * the `signed` health check lets the host's `sign` hook do it. Both then share
 * {@link readProbe}, so the two surfaces cannot drift apart.
 */
export async function fetchProbe(
  ctx: HookContext,
  headers?: Record<string, string>,
): Promise<ProbeReading> {
  try {
    const res = await ctx.fetch(PROBE_URL, {
      headers: { accept: "application/json", ...(headers ?? {}) },
    });
    return await readProbe(res);
  } catch (err) {
    return {
      reason: "unexpected",
      status: 0,
      detail: `could not reach ${PROBE_URL}: ${truncate(String(err), 200)}`,
    };
  }
}

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Token",
  description:
    'Paste a bearer token generated from Streamtime\'s Company Settings. This is the "via App" ' +
    "credential for a Streamtime subscriber; integrations that need OAuth for third-party " +
    "accounts go through the Streamtime Partner program instead, and are not configured here.",
  connectionLabel: "Streamtime ({{organisation}})",
  fields: [
    {
      key: "apiToken",
      label: "Bearer Token",
      type: "secret",
      required: true,
      hint: "In the Streamtime app open Company Settings and follow the process to request a " +
        "bearer token, then paste it here. Tokens are long-lived — generate one dedicated to " +
        "this connection so a workflow host never shares a token with a person.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The token never reaches a URL — the
   * vendor documents no `?token=` form, and a host logs URLs, not headers.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<StreamtimeCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const token = (credential as Partial<StreamtimeCredential>)?.apiToken?.trim() ?? "";
    if (!token) return { ok: false, message: "credential is missing `apiToken`" };

    const reading = await fetchProbe(ctx, authHeaders({ apiToken: token }));
    if (reading.reason === "accepted") return { ok: true };

    if (reading.reason === "rejected") {
      return {
        ok: false,
        message:
          `Streamtime rejected the token. ${reading.detail} Generate a fresh bearer token from ` +
          "Company Settings in the Streamtime app if this one was revoked or mistyped.",
      };
    }
    return { ok: false, message: `Streamtime did not accept the token: ${reading.detail}` };
  },

  /**
   * Publish the organisation's own name, and nothing else.
   *
   * `GET /organisation` answers with the organisation record; only `name` is
   * kept, so a list of connections does not fill up with currency and address
   * details. A failure here is deliberately silent: `test` has already
   * established whether the token is live, and a missing display label must not
   * fail a good connection.
   */
  async afterConnect({ credential }, ctx) {
    const reading = await fetchProbe(
      ctx,
      authHeaders(credential as Partial<StreamtimeCredential>),
    );
    const name = reading.organisation?.name;
    const domain = reading.organisation?.domain;
    if (!name) return {};
    return domain ? { organisation: name, domain } : { organisation: name };
  },
};

export default apiToken;
