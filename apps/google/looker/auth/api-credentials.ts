import type { AuthDefinition } from "@w6w/types";
import { describeError, normalizeHost } from "../lib/client.ts";

/**
 * Looker API3 credentials — a client id and secret, exchanged for a token.
 *
 * ## The credentials go in the URL, which is worth knowing
 *
 * `POST /api/4.0/login?client_id=…&client_secret=…`. Looker's own specification
 * documents both as **query parameters**, so the secret travels in a request
 * line — where it lands in proxy logs, access logs and anything else that
 * records URLs. Nothing here can change that; the mitigation is that the token
 * it returns lasts an hour, so what leaks is short-lived by design.
 *
 * The credentials themselves do not expire, and are the thing to protect.
 *
 * ## The credentials belong to a user, and inherit that user's permissions
 *
 * API3 credentials are attached to a Looker user account. Everything this app
 * can see and run is what that user could see and run in the interface —
 * including which models, which Explores and which rows, because Looker's
 * access filters and user attributes apply to API queries exactly as they do to
 * the UI.
 *
 * That is the right mechanism for narrowing a workflow: create a dedicated
 * Looker user with a restricted role, rather than looking for a scope on the
 * credential. There isn't one.
 *
 * ## The token lasts an hour
 *
 * So `refresh` re-runs the login. A workflow that ran for months and then
 * started failing with 401s is usually this rather than a revoked key.
 */
interface Credential {
  host: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  expiresAt?: string;
}

async function login(
  ctx: Parameters<NonNullable<AuthDefinition["refresh"]>>[1],
  creds: { host: string; clientId: string; clientSecret: string },
): Promise<Record<string, unknown>> {
  const host = normalizeHost(creds.host);
  const url = new URL(`${host}/api/4.0/login`);
  // Looker documents both as query parameters. They end up in request logs.
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("client_secret", creds.clientSecret);

  const res = await ctx.fetch(url.toString(), {
    method: "POST",
    headers: { accept: "application/json" },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Looker login failed (${res.status}): ${describeError(res.status, text)}`);
  }
  let body: { access_token?: string; expires_in?: number };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    throw new Error(
      `${host} did not return JSON from the login endpoint. For a SELF-HOSTED Looker the API is ` +
        "on port 19999 while the web interface is elsewhere, so a browser URL reaches something " +
        "that is not the API",
    );
  }
  if (!body.access_token) throw new Error("Looker returned no access token");

  return {
    ...creds,
    host,
    accessToken: body.access_token,
    // An hour, with a minute of headroom for clock skew.
    expiresAt: new Date(Date.now() + ((body.expires_in ?? 3600) - 60) * 1000).toISOString(),
  };
}

const apiCredentials: AuthDefinition = {
  key: "api-credentials",
  type: "custom",
  displayName: "API Credentials",
  description:
    "A Looker user's API3 client id and secret, exchanged for an hour-long token. The credential " +
    "inherits that USER's permissions — including model access and row-level filters — so a " +
    "dedicated restricted user is how a workflow is narrowed. There is no scope on the key.",
  connectionLabel: "{{userName}}",
  fields: [
    {
      key: "host",
      label: "Looker Instance",
      type: "string",
      required: true,
      default: "",
      placeholder: "https://mycompany.cloud.looker.com",
      hint: "For a SELF-HOSTED Looker the API is on port 19999, not the port the web interface " +
        "uses — 19999 is added automatically for a host that is not `*.cloud.looker.com`.",
    },
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Admin → Users → the user → Edit Keys.",
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Looker's login endpoint takes both as QUERY PARAMETERS, so the secret travels in a " +
        "request line and lands in proxy logs. It does not expire; the token it returns does.",
    },
  ],

  /** Turns the credentials into a live token at connect time. */
  exchange({ fields }, ctx) {
    const { host, clientId, clientSecret } = (fields ?? {}) as Record<string, string>;
    if (!host || !clientId || !clientSecret) {
      throw new Error("Looker Instance, Client ID and Client Secret are all required.");
    }
    return login(ctx, { host, clientId, clientSecret });
  },

  /** The same call again — the credentials outlive the token. */
  refresh({ credential }, ctx) {
    const { host, clientId, clientSecret } = credential as Credential;
    return login(ctx, { host, clientId, clientSecret });
  },

  sign({ request, credential }) {
    const { accessToken } = credential as Credential;
    request.headers["authorization"] = `token ${accessToken}`;
    return request;
  },

  /** `GET /api/4.0/user` — who these credentials are, and what they may do. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<Credential> | undefined;
    if (!cred?.accessToken) {
      return { ok: false, message: "credential has no access token — reconnect" };
    }
    let host: string;
    try {
      host = normalizeHost(cred.host);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${host}/api/4.0/user`, {
        headers: { authorization: `token ${cred.accessToken}`, accept: "application/json" },
      });
    } catch (err) {
      return {
        ok: false,
        message: `could not reach ${host}: ${String(err)}. For a self-hosted Looker the API is ` +
          "on port 19999, which is not the port the web interface answers on",
      };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    interface User {
      display_name?: string;
      email?: string;
      id?: string;
      is_disabled?: boolean;
    }
    let user: User | null = null;
    try {
      user = JSON.parse(text) as User;
    } catch {
      return { ok: false, message: "Looker did not return JSON" };
    }
    if (user?.is_disabled) {
      return {
        ok: false,
        message: "these credentials belong to a DISABLED Looker user — the login succeeds and " +
          "every query will be refused",
      };
    }
    return {
      ok: true,
      message: `connected as ${user?.display_name ?? user?.email ?? "a Looker user"} — this ` +
        "credential sees exactly what that user sees, including row-level access filters",
    };
  },

  /** Record the instance and the user, because both explain a later failure. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<Credential>;
    if (!cred?.accessToken) return {};
    let host: string;
    try {
      host = normalizeHost(cred.host);
    } catch {
      return {};
    }
    try {
      const res = await ctx.fetch(`${host}/api/4.0/user`, {
        headers: { authorization: `token ${cred.accessToken}`, accept: "application/json" },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return { host };
      }
      const user = await res.json().catch(() => null) as
        | { display_name?: string; id?: string }
        | null;
      return { host, userName: user?.display_name, userId: user?.id };
    } catch {
      return { host };
    }
  },
};

export default apiCredentials;
