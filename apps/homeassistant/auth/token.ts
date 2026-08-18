import type { AuthDefinition } from "@w6w/types";
import { describeError, normalizeUrl } from "../lib/client.ts";

/**
 * A long-lived access token.
 *
 * Home Assistant profile → **Security** → Long-lived access tokens → Create
 * token. It is shown once and never again.
 *
 * ## They do not expire, and that is the point to be careful about
 *
 * A long-lived token is valid for ten years and is not tied to a session. It
 * carries the **full permissions of the user who created it** — Home Assistant
 * has no scopes on the REST API, so a token from an administrator account can
 * do everything an administrator can, including calling
 * `homeassistant.restart` and reading every camera in the house.
 *
 * The mitigation Home Assistant offers is to create a **separate non-admin
 * user** for the integration and generate the token as them. That is worth
 * doing here, and the field hint says so.
 *
 * Revoking is done from the same screen, and deleting the user who created a
 * token revokes it too.
 *
 * ## The instance has to be reachable, which is not a given
 *
 * Home Assistant usually lives on a private network. If this connection is
 * being made from a hosted runner, `homeassistant.local` and `192.168.x.x`
 * cannot work — it needs Nabu Casa Cloud Remote UI, a tunnel, or a reverse
 * proxy with a public hostname. The test below reports that specifically rather
 * than as a timeout, because it is by far the most common reason this fails.
 */
const token: AuthDefinition = {
  key: "token",
  type: "bearer",
  displayName: "Long-Lived Access Token",
  description:
    "A long-lived access token from your Home Assistant profile. It never expires and carries " +
    "the FULL permissions of the user who made it — make a separate non-admin user for this.",
  connectionLabel: "{{locationName}}",
  fields: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      default: "",
      placeholder: "https://abc123.ui.nabu.casa",
      hint: "Must be reachable from wherever workflows run. A LAN address like " +
        "`http://homeassistant.local:8123` works only from the same network — otherwise use " +
        "Nabu Casa Cloud Remote UI, a tunnel, or a reverse proxy.",
    },
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Profile → Security → Long-lived access tokens → Create token. Shown once. It " +
        "inherits its creator's permissions and there are no scopes, so create a non-admin user " +
        "for it rather than using your own.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /api/` — the documented health endpoint, which answers
   * `{"message": "API running."}` and needs no permission beyond a valid token.
   */
  async test({ credential }, ctx) {
    const { url, token } = credential as { url?: string; token?: string };
    if (!url) return { ok: false, message: "credential missing the URL" };
    if (!token) return { ok: false, message: "credential missing the access token" };

    let base: string;
    try {
      base = normalizeUrl(url);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch (err) {
      const host = new URL(base).hostname;
      const isPrivate = /\.local$|^localhost$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./
        .test(host);
      if (isPrivate) {
        return {
          ok: false,
          message: `could not reach ${host}, which is a private address — a hosted runner cannot ` +
            "see your home network. Use Nabu Casa Cloud Remote UI, a tunnel, or a reverse proxy " +
            "with a public hostname",
        };
      }
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    let body: { message?: string } | null = null;
    try {
      body = JSON.parse(text) as { message?: string };
    } catch {
      return {
        ok: false,
        message: `${base}/api/ did not return JSON — this is usually a reverse proxy or a login ` +
          "page rather than Home Assistant itself",
      };
    }
    if (!/api running/i.test(body?.message ?? "")) {
      return { ok: false, message: `unexpected response from ${base}/api/` };
    }
    return { ok: true, message: `connected to ${new URL(base).host}` };
  },

  /**
   * `GET /api/config` names the installation, which is what makes a connection
   * label useful when somebody has two.
   */
  async afterConnect({ credential }, ctx) {
    const { url, token } = credential as { url?: string; token?: string };
    if (!url || !token) return {};
    let base: string;
    try {
      base = normalizeUrl(url);
    } catch {
      return {};
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/config`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch {
      return { url: base };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { url: base };
    }

    const config = await res.json().catch(() => null) as
      | { location_name?: string; version?: string }
      | null;
    return {
      url: base,
      locationName: config?.location_name ?? new URL(base).host,
      version: config?.version,
    };
  },
};

export default token;
