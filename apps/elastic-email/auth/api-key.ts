import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorText } from "../lib/client.ts";

/**
 * API key — `X-ElasticEmail-ApiKey: <key>`, the `apikey` scheme in the v4
 * OpenAPI document. Created in Settings > Manage API Keys. A key carries an
 * access level (ViewReports, ModifyContacts, SendHttp, …) that decides which
 * actions it can run. (The spec also lists `X-Auth-Token` for the white-label
 * "custom branding" tier; this app does not use it.)
 *
 * ## The probe: `GET /v4/statistics?from=<today>`
 *
 * Returns only counters (`Recipients`, `EmailTotal`, `Delivered`, `Bounced`, …)
 * — no credential material, so a failure message built from it cannot leak the
 * key. `from` is the only required query parameter. It needs `ViewReports`; a
 * key limited to sending only will be reported as "valid but lacks ViewReports"
 * rather than as broken.
 *
 * Measured 2026-10-06, unauthenticated and with a bogus key: HTTP **400**
 * `{"Error":"APIKey Expired"}` — not 401, and one message for "missing",
 * "unknown" and "expired" alike. So the verdict is read from the body's
 * `Error` text (the vendor has no machine code), never from the status.
 */
export const PROBE_PATH = "/statistics";

export interface ElasticCredential {
  apiKey: string;
}

export function authHeaders(credential: Partial<ElasticCredential>): Record<string, string> {
  return { "x-elasticemail-apikey": credential.apiKey ?? "" };
}

export function probeUrl(now: Date = new Date()): string {
  const from = now.toISOString().slice(0, 10) + "T00:00:00";
  return `${API_BASE}${API_PREFIX}${PROBE_PATH}?from=${from}`;
}

/** Classify a failed probe from the vendor's `Error` text, with the status as a hint. */
export function classifyProbeFailure(
  status: number,
  payload: unknown,
): { ok: false; message: string } {
  const text = errorText(payload);
  if (text !== undefined) {
    if (/api\s*-?key|expired|invalid|unauthori[sz]ed|authenticat/i.test(text)) {
      return {
        ok: false,
        message: `Elastic Email rejected the API key (${text}). Check it was copied exactly and ` +
          "has not been deleted or expired under Settings > Manage API Keys.",
      };
    }
    if (/access|permission|forbidden|denied|level/i.test(text)) {
      return {
        ok: false,
        message: `Elastic Email accepted the key but refused the statistics read (${text}); ` +
          "the key probably lacks the ViewReports access level.",
      };
    }
    return { ok: false, message: `Elastic Email returned HTTP ${status}: ${text}` };
  }
  return { ok: false, message: `Elastic Email returned HTTP ${status} for ${PROBE_PATH}` };
}

async function probe(apiKey: string, ctx: Parameters<NonNullable<AuthDefinition["test"]>>[1]) {
  const res = await ctx.fetch(probeUrl(), {
    headers: { accept: "application/json", ...authHeaders({ apiKey }) },
  });
  const payload = await res.json().catch(() => null);
  const isStats = payload !== null && typeof payload === "object" && !Array.isArray(payload) &&
    errorText(payload) === undefined;
  if (res.ok && isStats) return { ok: true as const };
  return classifyProbeFailure(res.status, payload);
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Elastic Email > Settings > Manage API Keys. Sent as the `X-ElasticEmail-ApiKey` header.",
  apiKey: {
    in: "header",
    name: "X-ElasticEmail-ApiKey",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings > Manage API Keys. The key's access level decides which actions work.",
    },
  ],

  sign({ request, credential }) {
    for (const [name, value] of Object.entries(authHeaders(credential as ElasticCredential))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<ElasticCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };
    return await probe(key, ctx);
  },
};

export default apiKey;
