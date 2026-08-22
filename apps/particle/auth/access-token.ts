import type { AuthDefinition } from "@w6w/types";
import { API_HOST, describeError } from "../lib/client.ts";

/**
 * A Particle access token.
 *
 * ## Two kinds, and the difference decides what the workflow can reach
 *
 * - A **user token** acts as the account. It sees every device the account has
 *   claimed, and it is what a personal or small-fleet automation uses.
 * - A **product token** is scoped to one product and its device fleet. Reaching
 *   a device that is not in that product is a 403, and the fleet is the point:
 *   a product's devices belong to the product rather than to a person.
 *
 * ## Tokens expire, and the default is 90 days
 *
 * A token created without an explicit lifetime lasts 90 days. So a Particle
 * integration that has worked since it was built stops working roughly three
 * months later, with a 401 that says only that the token is invalid. Creating
 * one with `expires_in=0` makes it non-expiring, which is a deliberate
 * trade rather than a default.
 *
 * ## The token is the device fleet
 *
 * There is no per-device scoping on a user token. Whoever holds it can call
 * every function on every claimed device — including whatever the firmware
 * exposes, which on real hardware means unlocking, actuating and rebooting.
 * A product token is the narrowing mechanism, and it is worth using.
 */
interface TokenCredential {
  token: string;
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "A Particle access token. It carries the whole device fleet — there is no per-device scoping " +
    "— and a token created without an explicit lifetime EXPIRES AFTER 90 DAYS, which is why a " +
    "working integration stops months later with an unhelpful 401.",
  connectionLabel: "{{username}}",
  fields: [
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "From the console or `particle token create`. A PRODUCT token narrows this to one " +
        "product's devices; a user token reaches every device the account has claimed.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as TokenCredential;
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /v1/user` — the smallest call that proves the token and says whose
   * it is.
   *
   * A product token has no user behind it and answers 403 here, which is not a
   * failure — so that case is reported as a working product token rather than
   * as a bad credential.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TokenCredential> | undefined;
    if (!cred?.token) return { ok: false, message: "credential missing the access token" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_HOST}/v1/user`, {
        headers: { authorization: `Bearer ${cred.token}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach Particle: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    if (res.status === 403) {
      // A product token has no user, and that is a working credential.
      return {
        ok: true,
        message: "connected with a token that has no user behind it — this is what a PRODUCT " +
          "token looks like, and it will reach that product's devices rather than an account's",
      };
    }
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    interface User {
      username?: string;
    }
    let user: User | null = null;
    try {
      user = JSON.parse(text) as User;
    } catch {
      return { ok: false, message: "Particle did not return JSON" };
    }
    return { ok: true, message: `connected as ${user?.username ?? "a Particle account"}` };
  },

  /** Record who this is, so a 403 later has a name attached to it. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TokenCredential>;
    if (!cred?.token) return {};
    try {
      const res = await ctx.fetch(`${API_HOST}/v1/user`, {
        headers: { authorization: `Bearer ${cred.token}`, accept: "application/json" },
      });
      if (!res.ok) {
        await res.body?.cancel();
        // A product token answers 403 here and is still perfectly usable.
        return res.status === 403 ? { tokenKind: "product" } : {};
      }
      const user = await res.json().catch(() => null) as { username?: string } | null;
      return { username: user?.username, tokenKind: "user" };
    } catch {
      return {};
    }
  },
};

export default accessToken;
