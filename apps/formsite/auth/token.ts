import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Access token (`bearer`).
 *
 * Formsite's access token is sent as `Authorization: bearer <token>`. The token
 * is account-wide (it reaches every form), found on a form's
 * Settings → Integrations → Formsite API page, which also shows the server and
 * user directory. Verified against support.formsite.com's "API" article.
 *
 * The server and user directory identify the account, so they are collected
 * here and echoed onto the connection's display data by `afterConnect`.
 *
 * `test` probes `GET /{user_dir}/forms` — it lists forms (no secret in the
 * body, so it cannot echo the credential). The verdict comes from the vendor's
 * `{ error: { status } }` body where one is present, with the HTTP status as a
 * fallback hint only.
 */
const token: AuthDefinition = {
  key: "token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "From a form's Settings → Integrations → Formsite API page. Requires a Professional-level Formsite plan.",
  connectionLabel: "{{userDir}} ({{server}})",
  fields: [
    {
      key: "server",
      label: "Server",
      type: "string",
      required: true,
      placeholder: "fs3",
      hint: "The host prefix from your form links — `fs3` in `fs3.formsite.com`.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "userDir",
      label: "User directory",
      type: "string",
      required: true,
      placeholder: "example",
      hint:
        "The account path segment from your form links — `example` in `fs3.formsite.com/example/form1`.",
      validation: { pattern: "^[a-zA-Z0-9_.-]+$" },
    },
    {
      key: "token",
      label: "Access token",
      type: "secret",
      required: true,
      hint: "Settings → Integrations → Formsite API.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `bearer ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { server, userDir, token } = credential as {
      server?: string;
      userDir?: string;
      token?: string;
    };
    if (!server || !userDir || !token) {
      return { ok: false, message: "credential missing server, userDir or token" };
    }
    const res = await ctx.fetch(`${baseUrl(server)}/${encodeURIComponent(userDir)}/forms`, {
      headers: { authorization: `bearer ${token}`, accept: "application/json" },
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({})) as {
      error?: { message?: string; status?: number };
    };
    const status = body.error?.status ?? res.status;
    const message = body.error?.message ?? `Formsite returned ${res.status}`;
    return { ok: false, message: `${message} (${status})` };
  },

  /** Records server and user directory on the connection so the client can build URLs. */
  afterConnect({ credential }) {
    const { server, userDir } = credential as { server?: string; userDir?: string };
    return { server, userDir };
  },
};

export default token;
