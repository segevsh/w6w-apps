import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Secret key — `Authorization: Bearer sk_test_…` / `sk_live_…`
 * (Dashboard > Settings > API Keys & Webhooks).
 *
 * ## The probe: `GET /transaction?perPage=1`
 *
 * Returns the transaction list envelope — `{status, message, data: [...], meta}` — which holds
 * transaction records, never the key. Measured 2026-10-06 against api.paystack.co:
 *  - no `Authorization` header  -> 401 `{"status":false,"message":"No Authorization Header was
 *    found", … "type":"validation_error","code":"invalid_Key"}`
 *  - a made-up bearer           -> 401 `{"status":false,"message":"Invalid key", …,
 *    "code":"invalid_Key"}`
 * so the endpoint genuinely requires a credential, and both refusals carry the vendor's own
 * `code`, which is what the verdict is classified from (the status is only a hint).
 */
export const PROBE_PATH = "/transaction";
export const PROBE_QUERY = "?perPage=1";

export interface PaystackCredential {
  secretKey: string;
}

export function authHeaders(credential: Partial<PaystackCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.secretKey ?? ""}` };
}

/** `test` or `live`, read from the key's own prefix; undefined for anything else. */
export function keyMode(key: string): "test" | "live" | undefined {
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return undefined;
}

interface ErrBody {
  status?: boolean;
  message?: string;
  code?: string;
  type?: string;
}

/** Classify a failed probe from the vendor's error body, with the status as a hint. */
export async function classifyProbeFailure(res: Response): Promise<{ ok: false; message: string }> {
  const body = await res.json().catch(() => null) as ErrBody | null;
  const code = body?.code;
  const message = body?.message;
  if (code === "invalid_Key") {
    return {
      ok: false,
      message: `Paystack rejected the secret key (${message ?? "invalid_Key"}). Check it was ` +
        "copied exactly, belongs to the right mode (test vs live) and has not been regenerated.",
    };
  }
  if (body && body.status === false && typeof message === "string") {
    return { ok: false, message: `Paystack refused the credential check: ${message}` };
  }
  return { ok: false, message: `Paystack returned HTTP ${res.status} for ${PROBE_PATH}` };
}

const secretKey: AuthDefinition = {
  key: "secret-key",
  type: "bearer",
  displayName: "Secret key",
  description:
    "Paste a Paystack secret key (sk_test_… or sk_live_…) from Dashboard > Settings > API Keys & " +
    "Webhooks. Use a test key while building.",
  connectionLabel: "Paystack ({{mode}})",
  fields: [
    {
      key: "secretKey",
      label: "Secret key",
      type: "secret",
      required: true,
      hint: "Dashboard > Settings > API Keys & Webhooks. Starts with sk_test_ or sk_live_. " +
        "Never use the public key (pk_…).",
    },
  ],

  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<PaystackCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<PaystackCredential>)?.secretKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing secretKey" };
    if (key.startsWith("pk_")) {
      return {
        ok: false,
        message: "That is a Paystack public key (pk_…). Use the secret key (sk_…) instead.",
      };
    }
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}${PROBE_QUERY}`, {
      headers: { accept: "application/json", ...authHeaders({ secretKey: key }) },
    });
    if (res.ok) return { ok: true };
    return await classifyProbeFailure(res);
  },

  /** No network: Paystack has no whoami, but the key's prefix names the mode. */
  afterConnect({ credential }) {
    const key = ((credential as Partial<PaystackCredential>)?.secretKey ?? "").trim();
    const mode = keyMode(key);
    return mode ? { mode } : {};
  },
};

export default secretKey;
