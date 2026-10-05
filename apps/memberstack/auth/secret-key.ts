import type { AuthDefinition } from "@w6w/types";
import type { MemberstackErrorBody } from "../lib/client.ts";
import { API_BASE, isInvalidKey } from "../lib/client.ts";

/**
 * Memberstack secret key — `X-API-KEY: <key>` (Quick Start, "Authentication Headers").
 * Live keys start `sk_`, sandbox keys `sk_sb_`; the key alone picks the environment.
 *
 * ## The probe: `POST /members/verify-token` with a junk token
 *
 * Memberstack has no whoami and no ping. The two obvious reads are poor probes:
 * `GET /members` returns members' emails and custom fields (personal data) and
 * `GET /v2/data-tables` depends on the app having tables. `verify-token` reads nothing and
 * writes nothing, and its documented failure is a *body code*: any token problem answers
 * `400 {"code":"INVALID_TOKEN"}`. So a junk token that comes back `INVALID_TOKEN` proves the
 * key was accepted and the route reached; `validation/invalid-secret-key` proves it was
 * rejected. Measured live 2026-10-05 for the rejected side: a well-formed unknown key
 * answers **401**, a malformed or missing key answers **400**, both with
 * `validation/invalid-secret-key` — so the status code cannot classify the key, the body
 * code does. The accepted side (`INVALID_TOKEN`) is the documented behaviour; it could not be
 * observed live without a real key.
 *
 * The response never contains the credential.
 */

export interface MemberstackCredential {
  apiKey: string;
}

export const PROBE_PATH = "/members/verify-token";
/** Deliberately not a JWT. Never a real member's token. */
export const PROBE_TOKEN = "w6w-connection-test";

export function authHeaders(credential: Partial<MemberstackCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

const secretKey: AuthDefinition = {
  key: "secret-key",
  type: "apiKey",
  displayName: "Secret Key",
  description: "Paste a secret key from the Memberstack dashboard (Dev Tools → Keys & IDs). " +
    "Keys starting sk_sb_ are sandbox keys (50 test members); keys starting sk_ are live.",
  connectionLabel: "Memberstack",
  apiKey: { in: "header", name: "X-API-KEY" },
  fields: [
    {
      key: "apiKey",
      label: "Secret Key",
      type: "secret",
      required: true,
      hint: "sk_… (live) or sk_sb_… (sandbox). It carries administrative privileges — keep it " +
        "server-side.",
    },
  ],

  sign({ request, credential }) {
    const cred = credential as Partial<MemberstackCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<MemberstackCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...authHeaders({ apiKey: key }),
      },
      body: JSON.stringify({ token: PROBE_TOKEN }),
    });
    const body = await res.json().catch(() => null) as MemberstackErrorBody | null;

    if (isInvalidKey(body)) {
      return {
        ok: false,
        message: "Memberstack rejected the secret key (validation/invalid-secret-key). Copy " +
          "it exactly from Dev Tools → Keys & IDs; it starts with sk_ or sk_sb_.",
      };
    }
    if (body?.code === "INVALID_TOKEN") return { ok: true };
    if (res.ok) return { ok: true };
    return {
      ok: false,
      message: `Memberstack returned HTTP ${res.status} for POST ${PROBE_PATH}` +
        (body?.code ? ` (${body.code})` : "") + " — the key could not be confirmed.",
    };
  },
};

export default secretKey;
