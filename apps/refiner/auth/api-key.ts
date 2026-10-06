import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorMessage } from "../lib/client.ts";

/**
 * Refiner API key — `Authorization: Bearer <key>`.
 *
 * Verified 2026-10-06 against https://refiner.io/docs/api/ and live probes of
 * `api.refiner.io`. The vendor documents three ways to present the key: the
 * Bearer header (the one it recommends), an `api_key` request parameter, and
 * HTTP Basic. This app only ever sends the header: a query-string key lands in
 * request logs, and a workflow host logs URLs, not headers.
 *
 * ## The wire answers a bad key three different ways
 *
 * Measured live, all against `GET /v1/account`:
 *
 *  - no key (or one too short to be taken for a key):
 *    `401 {"error":"No API key found in headers"}`
 *  - a malformed key: `401 {"error":"API key does not look valid"}`
 *  - a well-formed but unknown key (a UUID): **`404`**
 *    `{"message":"API key not valid or does not exist"}` — a different status
 *    AND a different JSON key (`message`, not `error`).
 *
 * So a status-only check would call a revoked key "not found" and read it as a
 * routing problem. {@link classifyKeyAnswer} reads the body.
 */

export interface RefinerCredential {
  apiKey: string;
}

export function authHeaders(credential: Partial<RefinerCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential probe: `GET /v1/` — the endpoint the vendor's own Authentication
 * section names for "verify that your API key works". It needs no plan or scope
 * and returns only `{project_uuid, project_name, message}`: no key material.
 */
export const PROBE_PATH = "/";

export type KeyAnswer =
  | { kind: "accepted"; projectName?: string; projectUuid?: string }
  | { kind: "key-missing" | "key-malformed" | "key-unknown"; detail: string }
  | { kind: "rate-limited" }
  | { kind: "other"; status: number; detail: string };

/**
 * Classify the probe's answer from the BODY first; the status is only a hint.
 * The three vendor phrases are matched case-insensitively.
 */
export function classifyKeyAnswer(status: number, text: string): KeyAnswer {
  let parsed: Record<string, unknown> | null = null;
  try {
    const p = JSON.parse(text);
    if (p && typeof p === "object" && !Array.isArray(p)) parsed = p as Record<string, unknown>;
  } catch {
    // fall through to the message-only classification
  }

  if (status >= 200 && status < 300 && parsed && typeof parsed.project_uuid === "string") {
    return {
      kind: "accepted",
      projectUuid: parsed.project_uuid,
      projectName: typeof parsed.project_name === "string" ? parsed.project_name : undefined,
    };
  }

  const detail = errorMessage(text);
  if (/no api key found/i.test(detail)) return { kind: "key-missing", detail };
  if (/does not look valid/i.test(detail)) return { kind: "key-malformed", detail };
  if (/not valid or does not exist/i.test(detail)) return { kind: "key-unknown", detail };
  if (status === 429) return { kind: "rate-limited" };
  return { kind: "other", status, detail };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste the REST API key from Refiner > Integrations > Rest API. A key belongs to one " +
    "Refiner environment (e.g. Production or Testing), so connect one key per environment.",
  connectionLabel: "Refiner ({{projectName}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Refiner dashboard > Integrations > Rest API. Each environment has its own key.",
    },
  ],

  sign({ request, credential }) {
    const cred = credential as Partial<RefinerCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<RefinerCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const answer = classifyKeyAnswer(res.status, await res.text().catch(() => ""));

    switch (answer.kind) {
      case "accepted":
        return { ok: true };
      case "key-missing":
        return {
          ok: false,
          message: "Refiner received no usable key — the credential did not reach the request. " +
            "Reconnect this connection.",
        };
      case "key-malformed":
        return {
          ok: false,
          message: "Refiner says the key does not look valid. Copy it again from Integrations > " +
            "Rest API.",
        };
      case "key-unknown":
        return {
          ok: false,
          message: "Refiner does not recognise this key (it may have been regenerated). Copy " +
            "the current one from Integrations > Rest API.",
        };
      case "rate-limited":
        return { ok: false, message: "Refiner rate-limited the check (429); try again shortly." };
      default:
        return {
          ok: false,
          message: `Refiner returned HTTP ${answer.status}${
            answer.detail ? `: ${answer.detail}` : ""
          } for GET ${API_PREFIX}${PROBE_PATH}`,
        };
    }
  },

  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<RefinerCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      const answer = classifyKeyAnswer(res.status, await res.text());
      if (answer.kind !== "accepted" || !answer.projectName) return {};
      return { projectName: answer.projectName, projectUuid: answer.projectUuid };
    } catch {
      return {};
    }
  },
};

export default apiKey;
