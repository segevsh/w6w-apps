import type { AuthDefinition } from "@w6w/types";
import { API_PATH, normalizeBaseUrl } from "../lib/client.ts";

/**
 * Personal access token in the `Authorization` header, with the `token`
 * scheme.
 *
 * ## The scheme word is `token`, not `Bearer`
 *
 * Gitea's own security definition says it: *"API tokens must be prepended with
 * `token` followed by a space."* Sending `Bearer` is the mistake worth naming,
 * because on many Gitea versions it fails exactly like a wrong token —
 * `401 {"message":"token is required"}` — so it reads as a credential problem
 * rather than a scheme one.
 *
 * ## The other two options, and why neither is used
 *
 *   - **`access_token` as a query parameter.** The document marks it
 *     *"deprecated for removal in Gitea 1.23"*, and a credential in a query
 *     string is a credential in every proxy log and browser history between
 *     here and the server. Not offered.
 *   - **Basic auth with a username and password.** It works, and it means
 *     handing a workflow the account password rather than a revocable,
 *     scopeable token. Not offered for that reason.
 *
 * ## The instance URL is half the credential
 *
 * Gitea is self-hosted: a token is meaningless without the address of the
 * server that issued it. Both are asked for together and the URL is normalised
 * once at connect time.
 */
const token: AuthDefinition = {
  key: "token",
  type: "custom",
  displayName: "Access Token",
  description:
    "A Gitea instance URL plus a personal access token from Settings → Applications. Sent as " +
    "`Authorization: token …` — not `Bearer`, which Gitea rejects.",
  connectionLabel: "{{login}} @ {{baseUrl}}",
  fields: [
    {
      key: "baseUrl",
      label: "Instance URL",
      type: "string",
      required: true,
      placeholder: "https://git.example.com",
      hint: "Your Gitea server. A URL without a scheme is assumed to be https.",
    },
    {
      key: "token",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Gitea → Settings → Applications → Generate New Token. Give it only the scopes the " +
        "workflow needs — a token with `write:repository` can force-push.",
    },
    {
      key: "owner",
      label: "Default Owner",
      type: "string",
      default: "",
      hint: "Optional. A user or organization, so repositories can be named without it.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    // The scheme word is `token`, per Gitea's own security definition.
    request.headers["authorization"] = `token ${token}`;
    return request;
  },

  /**
   * `GET /api/v1/user` is the narrowest call that proves the token works, and
   * it returns the account it belongs to — which is what makes a connection
   * label useful when several point at the same server.
   */
  async test({ credential }, ctx) {
    const { token, baseUrl } = credential as { token?: string; baseUrl?: string };
    if (!token) return { ok: false, message: "credential missing token" };
    if (!baseUrl) return { ok: false, message: "credential missing baseUrl" };

    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    const res = await ctx.fetch(`${base}${API_PATH}/user`, {
      headers: { authorization: `token ${token}`, accept: "application/json" },
    });
    if (res.status === 401) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        message: body.includes("token is required")
          ? "Gitea saw no usable token — check the token, and that it is sent as `token …` " +
            "rather than `Bearer …` (401)"
          : "Gitea rejected the token (401)",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "the token is valid but lacks the scope to read the user (403)",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `no Gitea API at ${base}${API_PATH} (404) — check the instance URL`,
      };
    }
    if (!res.ok) return { ok: false, message: `Gitea returned ${res.status}` };
    return { ok: true };
  },

  /** Records the instance, the account and the default owner. Never the token. */
  async afterConnect(_input, ctx) {
    const { credential } = _input as {
      credential: { token?: string; baseUrl?: string; owner?: string };
    };
    const display: Record<string, unknown> = {
      baseUrl: credential.baseUrl ? normalizeBaseUrl(credential.baseUrl) : undefined,
      owner: credential.owner?.trim() || undefined,
    };
    if (!credential.token || !display.baseUrl) return display;

    try {
      const res = await ctx.fetch(`${display.baseUrl}${API_PATH}/user`, {
        headers: { authorization: `token ${credential.token}`, accept: "application/json" },
      });
      if (!res.ok) return display;
      const body = await res.json() as { login?: string };
      display.login = body.login;
      // With no explicit default, the token's own account is the sensible one.
      display.owner = display.owner ?? body.login;
      return display;
    } catch {
      return display;
    }
  },
};

export default token;
