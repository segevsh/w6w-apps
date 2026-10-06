import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

export interface LeexiCredential {
  keyId: string;
  keySecret: string;
}

/**
 * The one place the wire format is built, shared by `sign` and `test` so the probe
 * sends exactly what real requests send. Leexi: "Authorization: Basic" followed by
 * `KEY_ID:KEY_SECRET` base64-encoded (developer.leexi.ai, Getting Started).
 */
export function basicHeader(credential: Partial<LeexiCredential>): string {
  return `Basic ${btoa(`${credential.keyId ?? ""}:${credential.keySecret ?? ""}`)}`;
}

/**
 * Turn a probe response into a verdict.
 *
 * Measured 2026-10-06: `GET /v1/users` with no credential AND with a bogus Basic pair both
 * answer `401` with an EMPTY `text/html` body, so a missing and a wrong key cannot be told
 * apart and there is no vendor error code to read. The documented statuses are therefore
 * the only signal: 401 = key missing/invalid, 403 = the key is genuine but lacks this
 * endpoint's permission scope (so the credential is live), 402 = inactive subscription.
 */
export function classifyProbe(status: number, body: unknown): { ok: boolean; message?: string } {
  if (status === 200) {
    const data = (body as { data?: unknown } | null)?.data;
    return Array.isArray(data) ? { ok: true } : {
      ok: false,
      message: "unexpected 200 body from GET /calls — not a Leexi list envelope",
    };
  }
  if (status === 403) return { ok: true };
  if (status === 401) {
    return { ok: false, message: "Leexi rejected the API key ID / secret (401)." };
  }
  if (status === 402) {
    return {
      ok: false,
      message: "The key is recognised but the related Leexi subscription is inactive (402).",
    };
  }
  if (status === 429) {
    return {
      ok: false,
      message:
        "Leexi rate-limited the check (429, 50 requests/minute); this says nothing about the key.",
    };
  }
  if (status >= 500) {
    return {
      ok: false,
      message: `Leexi is erroring (${status}); this is not a verdict on the key.`,
    };
  }
  return { ok: false, message: `Leexi returned an unexpected ${status} for GET /calls.` };
}

/**
 * API key — an API Key ID plus a Key Secret, sent as HTTP Basic. Created in
 * Leexi → Settings → Company Settings → API Keys by an admin. A new key only holds the
 * `read_calls` scope; every write scope is granted per key.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "API Key ID & Secret",
  description:
    "Create a key in Leexi → Settings → Company Settings → API Keys (admin only). Sent as HTTP Basic with the Key ID as username and the Key Secret as password. A new key only gets `read_calls`; grant the other scopes you need there. Resellers use a dedicated reseller key.",
  fields: [
    {
      key: "keyId",
      label: "API Key ID",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The Key ID half of the pair, used as the Basic username.",
    },
    {
      key: "keySecret",
      label: "Key Secret",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The Key Secret half, used as the Basic password.",
    },
  ],

  sign({ request, credential }) {
    request.headers["authorization"] = basicHeader(credential as Partial<LeexiCredential>);
    return request;
  },

  /**
   * Probe: `GET /calls?items=1` — the one list route every key can reach (`read_calls` is
   * the only scope a new key gets). The body is discarded, never stored or echoed. A 403
   * counts as a live credential: reseller keys hold only `read_clients`/`write_clients`
   * and are refused here, yet are perfectly valid.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<LeexiCredential>;
    const keyId = (cred?.keyId ?? "").trim();
    const keySecret = (cred?.keySecret ?? "").trim();
    if (!keyId || !keySecret) {
      return { ok: false, message: "credential missing keyId or keySecret" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/calls?items=1`, {
        headers: { accept: "application/json", authorization: basicHeader({ keyId, keySecret }) },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Leexi API: ${e}` };
    }
    const body = await res.json().catch(() => null);
    return classifyProbe(res.status, body);
  },
};

export default basic;
