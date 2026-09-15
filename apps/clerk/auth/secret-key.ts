import type { AuthDefinition } from "@w6w/types";
import { API_BASE, describeError } from "../lib/client.ts";

/**
 * Clerk's **Secret Key** — the Backend API's only credential.
 *
 * Verified live 2026-09-15: an unauthenticated call to `GET /v1/users` answers `401
 * {"errors":[{"message":"Invalid Authorization header format",...,"code":
 * "authorization_header_format_invalid"}]}`, and a syntactically-plausible but wrong key answers
 * `401 {"errors":[{"message":"The provided Clerk Secret Key is invalid...",...,"code":
 * "clerk_key_invalid"}]}` — two different 401s for two different problems, and the `code` field is
 * how `test` tells them apart without echoing the key back.
 *
 * A Secret Key is minted per Clerk instance (Dashboard → API Keys), starts `sk_live_` or
 * `sk_test_`, and is presented as a plain bearer token — there is no exchange, no expiry to
 * refresh, and no per-tenant host to record, which is why this Auth method has exactly one field.
 */
const secretKey: AuthDefinition = {
  key: "secret-key",
  type: "apiKey",
  displayName: "Secret Key",
  description: "A Clerk instance's Secret Key, from the Clerk Dashboard's API Keys page.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "secretKey",
      label: "Secret Key",
      type: "secret",
      required: true,
      hint: "Clerk Dashboard → Configure → API Keys → Secret Keys. Starts with `sk_live_` or " +
        "`sk_test_`.",
    },
  ],

  sign({ request, credential }) {
    const { secretKey } = credential as { secretKey: string };
    request.headers["authorization"] = `Bearer ${secretKey}`;
    return request;
  },

  /**
   * `GET /v1/users?limit=1` — the cheapest authenticated call, and one every Secret Key can make
   * regardless of which Clerk features the instance has turned on.
   */
  async test({ credential }, ctx) {
    const { secretKey } = credential as { secretKey?: string };
    if (!secretKey) return { ok: false, message: "credential has no secretKey — reconnect" };

    const res = await ctx.fetch(`${API_BASE}/users?limit=1`, {
      headers: { authorization: `Bearer ${secretKey}`, accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, message: `Clerk rejected the key: ${describeError(res.status, text)}` };
    }
    return { ok: true, message: "connected to Clerk" };
  },
};

export default secretKey;
