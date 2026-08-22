import type { AuthDefinition } from "@w6w/types";
import { describeError, normalizeHost } from "../lib/client.ts";

/**
 * A NocoDB API token, sent in `xc-token`.
 *
 * ## The other header is the one that expires
 *
 * NocoDB accepts two credentials. `xc-auth` carries the session JWT the web
 * interface uses; it expires, and a connection made with one stops working
 * days later with a 401 that says nothing about expiry. `xc-token` carries an
 * **API token**, which does not expire and is the one to use.
 *
 * They are interchangeable at every endpoint, so nothing about a working
 * connection reveals which was given — which is why the field says so.
 *
 * ## A token inherits its creator's access, and NocoDB has roles
 *
 * There is no scope on the token itself: what it can reach is what the person
 * who made it can reach, with their role in each base. A **viewer** can read
 * every record and write none, and the failure arrives at the first write as a
 * 403 rather than at connect time. The test reports how many bases are visible
 * so the reach is at least visible.
 *
 * ## `/api/v1/health` is unauthenticated, so the test uses something else
 *
 * A credential test has to use an endpoint that needs the credential. This
 * probes `/api/v2/meta/bases`, which does.
 */
const auth: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API token",
  apiKey: { in: "header", name: "xc-token" },
  connectionLabel: "{{hostLabel}}",
  description:
    "A NocoDB API token, sent in `xc-token`. Prefer it over the session JWT that goes in " +
    "`xc-auth`, which EXPIRES and takes the connection with it. A token has no scope of its own: " +
    "it inherits its creator's role in each base.",
  fields: [
    {
      key: "host",
      label: "Host",
      type: "string",
      required: true,
      placeholder: "https://app.nocodb.com or https://nocodb.internal",
      hint: "The base URL, with no `/api/...` path. NocoDB is self-hosted as often as it is used " +
        "on app.nocodb.com.",
    },
    {
      key: "token",
      label: "API token",
      type: "secret",
      required: true,
      hint: "Team & Settings → API Tokens. Not the session JWT from the browser — that one " +
        "expires.",
    },
  ],

  sign({ request, credential }) {
    const token = String((credential as Record<string, unknown>)?.token ?? "");
    return {
      ...request,
      headers: { ...request.headers, "xc-token": token },
    };
  },

  exchange({ fields }) {
    const values = fields as Record<string, unknown>;
    const host = normalizeHost(values?.host);
    const token = String(values?.token ?? "").trim();
    if (!token) throw new Error("`token` is required");
    return { host, token };
  },

  async test({ credential }, ctx) {
    const host = String((credential as Record<string, unknown>)?.host ?? "");
    let res: Response;
    try {
      // NOT /api/v1/health — that answers without a credential.
      res = await ctx.fetch(`${host}/api/v2/meta/bases`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    let bases: Array<{ title?: string }> = [];
    try {
      bases = (JSON.parse(text) as { list?: Array<{ title?: string }> })?.list ?? [];
    } catch { /* an unexpected shape is still an authenticated call */ }

    const remaining = res.headers.get("x-ratelimit-remaining");
    const limit = res.headers.get("x-ratelimit-limit");

    return {
      ok: true,
      message:
        `reached ${new URL(host).host} — ${bases.length} base${
          bases.length === 1 ? "" : "s"
        } visible to this token` +
        (limit
          ? `. This deployment allows ${limit} requests a minute (${remaining} left right now)`
          : ""),
    };
  },

  async afterConnect({ credential }, ctx) {
    const host = String((credential as Record<string, unknown>)?.host ?? "");
    let version = "";
    let cloud = false;
    try {
      // Unauthenticated, and it carries the version.
      const res = await ctx.fetch(`${host}/api/v2/meta/nocodb/info`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const info = await res.json() as { version?: string; ee?: boolean };
        version = String(info?.version ?? "");
        cloud = info?.ee === true;
      }
    } catch { /* the label is a convenience, not a gate */ }

    return {
      host,
      hostLabel: host ? new URL(host).host : "",
      version,
      edition: cloud ? "cloud or enterprise" : "open source",
    };
  },
};

export default auth;
