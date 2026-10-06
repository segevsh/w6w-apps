import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorMessage } from "../lib/client.ts";

/**
 * Recruiterflow API key — `RF-Api-Key: <key>` (Recruiterflow OpenAPI document, header parameter
 * on every operation; "All requests to any Recruiterflow API must include the RF-Api-Key header").
 *
 * ## Probe: `POST /api/external/info`
 *
 * Measured live on 2026-10-06 against `api.recruiterflow.com`:
 *
 *   | Request                    | Status  | Body                                  |
 *   | -------------------------- | ------- | ------------------------------------- |
 *   | no `RF-Api-Key`            | **400** | `{"message":"Please supply an API key"}` |
 *   | `RF-Api-Key: bogus`        | 401     | `{"message":"Invalid API key"}`       |
 *
 * A missing key is a 400, not a 401, so the verdict is read from the body. `/info` is the vendor's
 * dedicated account ping: success is `{"data":{"display_name": "..."}}` (the account's display
 * name, never the key). Success is the documented field, not a bare 200.
 */
export interface RecruiterflowCredential {
  apiKey: string;
}

export const PROBE_PATH = "/info";

export function authHeaders(credential: Partial<RecruiterflowCredential>): Record<string, string> {
  return { "rf-api-key": credential.apiKey ?? "" };
}

async function info(
  fetchFn: typeof fetch,
  apiKey: string,
): Promise<{ status: number; body: { data?: { display_name?: string } } | null }> {
  const res = await fetchFn(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
    method: "POST",
    headers: { accept: "application/json", ...authHeaders({ apiKey }) },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A Recruiterflow API key, sent as the `RF-Api-Key` header.",
  connectionLabel: "Recruiterflow ({{displayName}})",
  apiKey: { in: "header", name: "RF-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Recruiterflow > Settings > API / Integrations (an admin generates the key).",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(
        authHeaders(credential as Partial<RecruiterflowCredential>),
      )
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<RecruiterflowCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const { status, body } = await info(ctx.fetch, key);
    if (status >= 200 && status < 300 && typeof body?.data?.display_name === "string") {
      return { ok: true };
    }
    const message = errorMessage(body);
    if (message && /supply an api key/i.test(message)) {
      return {
        ok: false,
        message: "Recruiterflow received no key. The credential did not reach the request.",
      };
    }
    if (message && /invalid api key/i.test(message)) {
      return {
        ok: false,
        message: "Recruiterflow rejected the API key. Check it was copied exactly and is still " +
          "active.",
      };
    }
    return {
      ok: false,
      message: `Recruiterflow returned HTTP ${status} for ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },

  /** Publish the account display name for the connection label; a failure is silent. */
  async afterConnect({ credential }, ctx) {
    try {
      const { body } = await info(
        ctx.fetch,
        ((credential as Partial<RecruiterflowCredential>)?.apiKey ?? "").trim(),
      );
      const displayName = body?.data?.display_name;
      return displayName ? { displayName } : {};
    } catch {
      return {};
    }
  },
};

export default apiKey;
