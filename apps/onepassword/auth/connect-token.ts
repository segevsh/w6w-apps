import type { AuthDefinition } from "@w6w/types";
import { describeError, normalizeUrl } from "../lib/client.ts";

/**
 * A 1Password Connect token.
 *
 * ## What this credential can do, stated plainly
 *
 * A Connect token can **read every secret in the vaults it was issued for**.
 * That is what it is for, and it is the most powerful credential this pack
 * handles.
 *
 * Two properties make it safe enough to automate, and both are worth
 * understanding before creating one:
 *
 * - **It is scoped to vaults at issue time**, and the scope cannot be widened
 *   afterwards. A token for one vault cannot see another; the only way to
 *   change that is to issue a new token. So the right shape is a vault per
 *   purpose and a token per integration, not one token for everything.
 * - **It is not an account credential.** It cannot sign in, cannot see the
 *   account's users, and cannot reach anything outside its Connect server.
 *
 * Tokens can also be issued with an expiry, and one that had a lifetime simply
 * starts returning 401 — the error handler names that possibility rather than
 * asserting the token is wrong.
 *
 * ## The server is yours
 *
 * Connect runs as a container on your own infrastructure, usually inside a
 * private network. A workflow runner elsewhere cannot reach it, and the test
 * below says so specifically rather than reporting a timeout.
 */
const connectToken: AuthDefinition = {
  key: "connect-token",
  type: "bearer",
  displayName: "Connect Token",
  description:
    "A token for a 1Password Connect server. It can read every secret in the vaults it was " +
    "issued for, and its scope cannot be widened afterwards — so issue one per integration.",
  connectionLabel: "1Password Connect ({{host}})",
  fields: [
    {
      key: "url",
      label: "Connect Server URL",
      type: "string",
      required: true,
      default: "",
      placeholder: "http://onepassword-connect:8080",
      hint: "Where your Connect container is listening. It must be reachable from wherever " +
        "workflows run — a private address works only from the same network.",
    },
    {
      key: "token",
      label: "Connect Token",
      type: "secret",
      required: true,
      hint: "Issued alongside the server's credentials file, scoped to specific vaults. Create a " +
        "separate token per integration: the scope is fixed at issue time and cannot be widened.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /v1/vaults` — the smallest call that proves the token, and it also
   * reports how much the token can see, which is the number worth knowing.
   */
  async test({ credential }, ctx) {
    const { url, token } = credential as { url?: string; token?: string };
    if (!url) return { ok: false, message: "credential missing the Connect server URL" };
    if (!token) return { ok: false, message: "credential missing the Connect token" };

    let base: string;
    try {
      base = normalizeUrl(url);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/v1/vaults`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch (err) {
      const host = new URL(base).hostname;
      const isPrivate =
        /^localhost$|\.local$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^[a-z0-9-]+$/i
          .test(host);
      if (isPrivate) {
        return {
          ok: false,
          message: `could not reach ${host}, which is a private or container-internal address — ` +
            "a workflow runner outside that network cannot see it. Connect is designed to run " +
            "beside whatever uses it",
        };
      }
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text, "connect") };

    let vaults: Array<{ id?: string; name?: string }> = [];
    try {
      vaults = JSON.parse(text) as typeof vaults;
    } catch {
      return {
        ok: false,
        message: "the Connect server did not return JSON — this is usually a proxy or a " +
          "different service on that port",
      };
    }
    if (!Array.isArray(vaults)) {
      return { ok: false, message: "the Connect server did not return a list of vaults" };
    }
    if (vaults.length === 0) {
      return {
        ok: false,
        message: "this token is scoped to no vaults, so it can read nothing. Reissue it naming " +
          "the vaults the integration needs",
      };
    }

    return {
      ok: true,
      // The count, never the names — a vault name describes what is in it.
      message: `connected — this token can reach ${vaults.length} vault${
        vaults.length === 1 ? "" : "s"
      }`,
    };
  },

  async afterConnect({ credential }, ctx) {
    const { url, token } = credential as { url?: string; token?: string };
    if (!url || !token) return { surface: "connect" };
    let base: string;
    try {
      base = normalizeUrl(url);
    } catch {
      return { surface: "connect" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/v1/vaults`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch {
      return { surface: "connect", url: base, host: new URL(base).host };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { surface: "connect", url: base, host: new URL(base).host };
    }

    const vaults = await res.json().catch(() => []) as unknown[];
    return {
      surface: "connect",
      url: base,
      host: new URL(base).host,
      // How much this token can see, which is the number worth surfacing.
      vaultCount: Array.isArray(vaults) ? vaults.length : undefined,
    };
  },
};

export default connectToken;
