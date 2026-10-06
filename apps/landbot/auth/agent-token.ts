import type { AuthDefinition } from "@w6w/types";
import { API_BASE, baseHeaders, errorText } from "../lib/client.ts";

/**
 * Landbot agent token — `Authorization: Token <agent_token>`.
 *
 * The OpenAPI document: "the value **must include the literal `Token ` prefix** (a bare token
 * returns `401 Unauthorized`)". The token comes from app.landbot.io > Settings > Account and is
 * workspace-wide.
 *
 * ## The probe is `GET /customers/?limit=1`
 *
 * Documented shape `{ success, total, customers }`. It does not return the agent token (the
 * channel list does carry channel tokens, so it is NOT the probe). It does contain customer
 * records, so `test` keeps only a boolean and `afterConnect` nothing from the body.
 *
 * ## Classification is from the body
 *
 * Measured 2026-10-06 on `GET /channels/`: no header answers `401 {"detail":"Authentication
 * credentials were not provided."}`, a bogus token `401 {"detail":"Invalid token."}`. A pass is
 * a 2xx carrying the documented `customers` array; a 401/403 is a rejection whose message quotes
 * the vendor's own `detail`; anything else is not judged.
 */

export interface LandbotCredential {
  token: string;
}

export const PROBE_PATH = "/customers/?limit=1";

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<LandbotCredential>): Record<string, string> {
  return { authorization: `Token ${(credential.token ?? "").trim()}` };
}

const agentToken: AuthDefinition = {
  key: "agent-token",
  type: "apiKey",
  displayName: "Agent Token",
  description: "Paste your Landbot agent token (app.landbot.io > Settings > Account). It is " +
    "workspace-wide, so it can read and message every customer in the workspace.",
  connectionLabel: "Landbot",
  apiKey: { in: "header", name: "Authorization", prefix: "Token " },
  fields: [
    {
      key: "token",
      label: "Agent Token",
      type: "secret",
      required: true,
      hint: "app.landbot.io > Settings > Account. Paste the token only; the `Token ` prefix is " +
        "added for you.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps the header. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<LandbotCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<LandbotCredential>;
    const raw = (cred?.token ?? "").trim();
    if (!raw) return { ok: false, message: "credential missing token" };
    if (/^token\s/i.test(raw)) {
      return {
        ok: false,
        message: 'Paste the token only — the "Token " prefix is added for you.',
      };
    }

    // `sign` only auto-applies to action traffic, so the header is built by hand here.
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { ...baseHeaders(), ...authHeaders(cred) },
    });
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;

    if (res.ok) {
      if (body && Array.isArray(body.customers)) return { ok: true };
      return {
        ok: false,
        message: `Landbot answered ${res.status} but not with a customers list — not the ` +
          "documented /customers/ response.",
      };
    }
    const msg = errorText(body);
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Landbot refused the token (${res.status}${msg ? ` ${msg}` : ""}). Check it ` +
          "was copied from Settings > Account and has not been regenerated.",
      };
    }
    return {
      ok: false,
      message: `Landbot returned HTTP ${res.status}${msg ? ` (${msg})` : ""} for /customers/; ` +
        "the token was not judged.",
    };
  },
};

export default agentToken;
