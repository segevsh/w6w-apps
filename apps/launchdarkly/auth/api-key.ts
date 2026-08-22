import type { AuthDefinition } from "@w6w/types";
import { API_PATH, HOSTS, type LaunchDarklyInstance } from "../lib/client.ts";

/**
 * API access token in the `Authorization` header, **with no scheme word**.
 *
 * LaunchDarkly's security definition is `type: apiKey, in: header, name:
 * Authorization` — the token is the entire header value. Not `Bearer <token>`,
 * not `token <token>`. That is unusual enough to be the first thing to check
 * when a valid-looking key is rejected, and it is why this app builds the
 * header rather than leaving it to a generic bearer helper.
 *
 * ## Two instances, and a key belongs to exactly one
 *
 * `app.launchdarkly.com` is the commercial service; `app.launchdarkly.us` is
 * LaunchDarkly's US-government (FedRAMP) instance. An account exists in one or
 * the other and a key from one is unknown to the other, so the instance is
 * asked for rather than guessed, and `test` probes the chosen one.
 *
 * ## On the token itself
 *
 * LaunchDarkly tokens carry a **role**, and a service token with the Writer
 * role can turn a flag on in production. There is no narrower scope this app
 * can request on your behalf — the scoping happens when the token is minted —
 * so the field hint says to mint a custom-role token rather than reaching for
 * an admin one.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Access Token",
  description:
    "A LaunchDarkly access token from Account settings → Authorization. Sent as the whole " +
    "`Authorization` header value — no `Bearer` prefix.",
  connectionLabel: "{{projectKey}} ({{instance}})",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "apiKey",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Account settings → Authorization → Access tokens. Prefer a custom role over " +
        "Writer or Admin — a Writer token can turn a flag on in production.",
    },
    {
      key: "instance",
      label: "Instance",
      type: "select",
      required: true,
      default: "commercial",
      options: [
        { value: "commercial", label: "Commercial (app.launchdarkly.com)" },
        { value: "federal", label: "US Government / FedRAMP (app.launchdarkly.us)" },
      ],
      hint: "A key from one instance is unknown to the other.",
    },
    {
      key: "project",
      label: "Default Project",
      type: "string",
      default: "",
      placeholder: "default",
      hint: "Optional. Almost every path is project-scoped, so setting it once saves repeating it.",
    },
    {
      key: "environment",
      label: "Default Environment",
      type: "string",
      default: "",
      placeholder: "production",
      hint: "Optional — and worth thinking about, since it is what flag toggles act on by " +
        "default.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // The token IS the header value — no scheme word.
    request.headers["authorization"] = apiKey;
    return request;
  },

  /**
   * `GET /api/v2/projects?limit=1` proves the key works on the chosen instance.
   * `/caller-identity` would say more, but it is not available to every token
   * type, and a connection that fails for the wrong reason is worse than one
   * that proves less.
   */
  async test({ credential }, ctx) {
    const { apiKey, instance } = credential as {
      apiKey?: string;
      instance?: LaunchDarklyInstance;
    };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const host = HOSTS[(instance ?? "commercial") as LaunchDarklyInstance] ?? HOSTS.commercial;

    const res = await ctx.fetch(`${host}${API_PATH}/projects?limit=1`, {
      headers: { authorization: apiKey, accept: "application/json" },
    });
    if (res.status === 401) {
      return {
        ok: false,
        message:
          `LaunchDarkly rejected the token on the ${instance ?? "commercial"} instance (401) — ` +
          "check the token, the instance, and that it is sent with no `Bearer` prefix",
      };
    }
    if (res.status === 403) {
      return { ok: false, message: "the token is valid but its role cannot list projects (403)" };
    }
    if (!res.ok) return { ok: false, message: `LaunchDarkly returned ${res.status}` };
    return { ok: true };
  },

  /** Publishes the instance and the defaults the actions build paths from. */
  afterConnect(_input) {
    const { credential } = _input as {
      credential: {
        instance?: LaunchDarklyInstance;
        project?: string;
        environment?: string;
      };
    };
    // The connection stores them as `…Key`, which is what the client reads and
    // what LaunchDarkly's paths call them. The credential FIELDS are named
    // without the suffix so the pack's audit does not read "…Key" as a secret.
    return {
      instance: credential.instance ?? "commercial",
      projectKey: credential.project?.trim() || undefined,
      environmentKey: credential.environment?.trim() || undefined,
    };
  },
};

export default apiKey;
