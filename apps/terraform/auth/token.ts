import type { AuthDefinition } from "@w6w/types";
import { DEFAULT_HOST, describeError, MEDIA_TYPE, normalizeHost } from "../lib/client.ts";

/**
 * An HCP Terraform / Terraform Enterprise API token.
 *
 * ## There are three kinds, and which one this is decides what fails
 *
 * They are all opaque strings of the same shape and they are not
 * interchangeable:
 *
 * - **User token** — acts as a person, reaching every organisation and
 *   workspace that person can. This is what almost every automation should
 *   hold, and what this app is written against.
 * - **Team token** — scoped to one team's workspace permissions. Workspaces
 *   outside the team return **404**, not 403, so a missing grant is
 *   indistinguishable from a typo in the workspace name.
 * - **Organization token** — one per organisation, for *managing the
 *   organisation*: creating workspaces, teams and variable sets. It **cannot
 *   create runs and cannot read state**, which is the failure people hit after
 *   choosing it because it sounds like the most powerful one.
 *
 * `GET /api/v2/account/details` reports which kind is connected, and this
 * records it — because a 403 on `run-create` months later says nothing about
 * token types.
 *
 * ## The instance is part of the credential
 *
 * Terraform Enterprise is the same API self-hosted at the organisation's own
 * address. A token is valid on the instance that issued it and nowhere else,
 * so the host is a field here rather than an assumption.
 */
const token: AuthDefinition = {
  key: "token",
  type: "bearer",
  displayName: "API Token",
  description:
    "A user, team or organization token. The three are NOT interchangeable — an organization " +
    "token cannot create runs or read state, and a team token answers 404 for workspaces " +
    "outside its team.",
  connectionLabel: "{{username}}",
  fields: [
    {
      key: "host",
      label: "Host",
      type: "string",
      default: DEFAULT_HOST,
      placeholder: DEFAULT_HOST,
      hint: "HCP Terraform, or your own Terraform Enterprise address. A token is only valid on " +
        "the instance that issued it.",
    },
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "User settings → Tokens. Prefer a USER token: an organization token cannot create " +
        "runs or read state, which is the surprise most automations hit.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /api/v2/account/details` — the smallest call that proves the token
   * and says which kind it is.
   *
   * `/api/v2/ping` would prove the instance is up but not the token: it
   * answers **204 unauthenticated**, verified live. That makes it the right
   * probe for the health check and the wrong one here.
   */
  async test({ credential }, ctx) {
    const { host, token } = credential as { host?: string; token?: string };
    if (!token) return { ok: false, message: "credential missing the API token" };

    let base: string;
    try {
      base = normalizeHost(host);
    } catch (err) {
      return { ok: false, message: String(err) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/v2/account/details`, {
        headers: { authorization: `Bearer ${token}`, accept: MEDIA_TYPE },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return {
        ok: false,
        message: `${describeError(res.status, text)}. Check the token belongs to this instance — ` +
          "a token from a different Terraform Enterprise fails exactly like a wrong one",
      };
    }

    interface AccountDocument {
      data?: { id?: string; attributes?: Record<string, unknown> };
    }
    let account: AccountDocument | null = null;
    try {
      account = JSON.parse(text) as AccountDocument;
    } catch {
      return {
        ok: false,
        message: `${base} did not return JSON:API — this is usually a proxy or a landing page ` +
          "rather than a Terraform instance",
      };
    }

    const attributes = account?.data?.attributes ?? {};
    const username = String(attributes["username"] ?? "").trim();
    const email = String(attributes["email"] ?? "").trim();
    const serviceAccount = attributes["is-service-account"] === true;

    return {
      ok: true,
      message: `connected as ${username || email || "an account"} on ${new URL(base).host}` +
        (serviceAccount ? " (a service account)" : ""),
    };
  },

  /**
   * Record what the instance says about itself.
   *
   * `tfp-appname` distinguishes HCP Terraform from a self-hosted Terraform
   * Enterprise, and `tfp-api-version` is what the `instance` health check
   * compares against later — a Terraform Enterprise upgrade changes it, and
   * an endpoint added in a newer version 404s on an older one with nothing in
   * the error mentioning versions.
   */
  async afterConnect({ credential }, ctx) {
    const { host, token } = credential as { host?: string; token?: string };
    if (!token) return {};
    let base: string;
    try {
      base = normalizeHost(host);
    } catch {
      return {};
    }

    const display: Record<string, unknown> = { host: base };

    try {
      // Unauthenticated on purpose: it answers 204 with the version headers,
      // and works even if the token turns out to be wrong.
      const ping = await ctx.fetch(`${base}/api/v2/ping`, { headers: { accept: MEDIA_TYPE } });
      await ping.body?.cancel();
      const appName = ping.headers.get("tfp-appname");
      const apiVersion = ping.headers.get("tfp-api-version");
      if (appName) display.appName = appName;
      if (apiVersion) display.apiVersion = apiVersion;
    } catch { /* the version is useful, not essential */ }

    try {
      const res = await ctx.fetch(`${base}/api/v2/account/details`, {
        headers: { authorization: `Bearer ${token}`, accept: MEDIA_TYPE },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return display;
      }
      const body = await res.json().catch(() => null) as
        | { data?: { attributes?: Record<string, unknown> } }
        | null;
      const attributes = body?.data?.attributes ?? {};
      if (attributes["username"]) display.username = attributes["username"];
      if (attributes["is-service-account"] === true) display.serviceAccount = true;
    } catch { /* the label is a nicety */ }

    return display;
  },
};

export default token;
