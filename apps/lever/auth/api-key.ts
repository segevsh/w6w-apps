import type { AuthDefinition } from "@w6w/types";
import { API, describeError, SANDBOX_API } from "../lib/client.ts";

/**
 * A Lever API key, sent as the **username** of HTTP Basic with an empty
 * password.
 *
 * ## Not a bearer token, and the 401 does not say so
 *
 * Lever's documentation: "Authenticate to the Lever API via basic auth by
 * providing an API key as the username and leaving the password blank." A
 * client that sends `Authorization: Bearer <key>` gets the same
 * `UnauthorizedError` as a wrong key.
 *
 * ## Confidential access is decided when the key is made
 *
 * Lever grants a key access to confidential postings, opportunities and
 * requisitions **at creation** and does not allow adding it later. So a key
 * either can see that data or a new key is needed — and a key without it does
 * not get a 403 on a list, it gets a shorter list.
 *
 * The test probes for it, because knowing at connect time is much better than
 * discovering it in a reconciliation months later.
 *
 * ## Keys carry many privileges
 *
 * Lever's own warning. There is no per-endpoint scope: a key that can read
 * candidates can archive them, and a key that can list postings can create
 * them. The only boundary is confidential access and the account's own
 * settings.
 */
const auth: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API key",
  connectionLabel: "{{environment}}",
  description:
    "A Lever API key, sent as the BASIC AUTH USERNAME with an empty password — not a bearer " +
    "token, and Lever answers the same 401 either way. The test reports whether this key can " +
    "see CONFIDENTIAL data, which is granted only when a key is created.",
  fields: [
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      hint: "Settings → Integrations and API → API Credentials. Lever keys carry many " +
        "privileges — there is no per-endpoint scope.",
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      default: "production",
      required: true,
      options: [
        { value: "production", label: "Production — api.lever.co" },
        { value: "sandbox", label: "Sandbox — api.sandbox.lever.co" },
      ],
      hint: "The sandbox is a separate account with its own keys and its own data.",
    },
    {
      key: "dataCenter",
      label: "Data centre",
      type: "select",
      default: "global",
      advanced: true,
      options: [
        { value: "global", label: "Global" },
        { value: "eu", label: "European Union" },
      ],
      hint: "Used only by the health check: Lever's status page reports the API separately for " +
        "each data centre, and an account lives in one of them.",
    },
  ],

  sign({ request, credential }) {
    const apiKey = String((credential as Record<string, unknown>)?.apiKey ?? "");
    // The key is the username; the password is empty.
    const encoded = btoa(`${apiKey}:`);
    return {
      ...request,
      headers: { ...request.headers, authorization: `Basic ${encoded}` },
    };
  },

  async test({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const host = fields?.environment === "sandbox" ? SANDBOX_API : API;

    let res: Response;
    try {
      res = await ctx.fetch(`${host}/users?limit=1`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text) };

    let users: Array<{ name?: string }> = [];
    try {
      users = (JSON.parse(text) as { data?: Array<{ name?: string }> })?.data ?? [];
    } catch { /* an unexpected shape is still an authenticated call */ }

    // Granted at key creation only, and invisible in an ordinary response.
    let confidential = "";
    try {
      const probe = await ctx.fetch(
        `${host}/opportunities?limit=1&confidentiality=confidential`,
        { headers: { accept: "application/json" } },
      );
      confidential = probe.ok
        ? ". This key CAN read confidential data"
        : ". This key CANNOT read confidential data — that is granted only when a key is " +
          "created, so lists will silently omit confidential records";
    } catch { /* the detail is a courtesy, not a gate */ }

    const environment = String(fields?.environment ?? "production");
    return {
      ok: true,
      message: `reached Lever ${environment}` +
        (users.length ? ` as ${users[0]?.name ?? "an unnamed user"}'s account` : "") +
        confidential,
    };
  },

  afterConnect({ credential }) {
    const fields = credential as Record<string, unknown>;
    return {
      environment: String(fields?.environment ?? "production"),
      dataCenter: String(fields?.dataCenter ?? "global"),
    };
  },
};

export default auth;
