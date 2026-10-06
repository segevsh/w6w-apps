import type { AuthDefinition } from "@w6w/types";
import { API_ORIGIN, API_PREFIX } from "../lib/client.ts";

interface Cred {
  authId: string;
  authToken: string;
}

/**
 * Plivo uses HTTP Basic auth: Auth ID as the username, Auth Token as the
 * password, both from the Plivo Console dashboard.
 *
 * The Auth ID is also part of every request path, so `afterConnect` publishes it
 * (it is not a secret) for actions to read from `ctx.connection.display`.
 *
 * `test` reads the Account resource. That is a credential-safe probe: the
 * documented Account object is name, address, city, state, timezone, billing
 * mode and `cash_credits` — it does NOT return the auth token. It also needs no
 * product scope, so any working credential can read it.
 *
 * The verdict comes from the BODY, not the status code: a bad or missing
 * credential is answered with a plain-text 401 (identical for both), while a
 * success is a JSON document whose `auth_id` is the one we asked about. Anything
 * else that happens to answer 200 — a proxy page, a captive portal — is rejected.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Auth ID & Auth Token",
  description: "Authenticate with your Plivo Auth ID and Auth Token.",
  fields: [
    {
      key: "authId",
      label: "Auth ID",
      type: "string",
      required: true,
      hint:
        "Plivo Console → Overview → API Keys & Credentials → Auth ID (e.g. MAXXXXXXXXXXXXXXXXXX).",
    },
    {
      key: "authToken",
      label: "Auth Token",
      type: "secret",
      required: true,
      hint: "Plivo Console → Overview → API Keys & Credentials → Auth Token.",
    },
  ],

  sign({ request, credential }) {
    const { authId, authToken } = credential as unknown as Cred;
    request.headers["authorization"] = `Basic ${btoa(`${authId}:${authToken}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { authId, authToken } = credential as unknown as Cred;
    const res = await ctx.fetch(`${API_ORIGIN}${API_PREFIX}/${encodeURIComponent(authId)}/`, {
      headers: { authorization: `Basic ${btoa(`${authId}:${authToken}`)}` },
    });
    const text = await res.text().catch(() => "");
    let body: { auth_id?: unknown } | undefined;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (res.ok && body && body.auth_id === authId) return { ok: true };
    if (res.status === 401) {
      return { ok: false, message: "Plivo rejected the Auth ID / Auth Token pair." };
    }
    return { ok: false, message: `Plivo returned ${res.status} without an account document.` };
  },

  afterConnect({ credential }) {
    const { authId } = credential as unknown as Cred;
    return { authId };
  },
};

export default basic;
