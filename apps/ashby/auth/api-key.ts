import type { AuthDefinition } from "@w6w/types";
import { API_VERSION, BASE_URL } from "../lib/client.ts";

/**
 * An Ashby API key, sent as HTTP Basic with the key as the **username** and an
 * **empty password**.
 *
 * ## The key's scopes are the thing to get right
 *
 * Ashby keys are not all-or-nothing: permissions are granted per module — Jobs,
 * Candidates, Emails, Sourcing, Interviews, Hiring Process, Organization,
 * Offers, API Keys, Approvals, Reports, Notetaker, Audit Logs — as read or
 * write, in the Ashby app rather than here.
 *
 * That is good, and it means **a key can authenticate perfectly and still fail
 * every action a workflow performs**. So the connection test reads the key's
 * own scopes back and reports them, which turns "403 on the fourth step at 2am"
 * into something visible when the connection is made.
 *
 * Two permissions are **off by default** and worth knowing about because their
 * absence looks like missing data rather than a permission problem: access to
 * confidential jobs and projects, and access to non-offer private fields.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "An Ashby API key, sent as the Basic-auth username with an empty password. Its per-module " +
    "scopes are granted in Ashby — a key can authenticate and still be refused every action.",
  connectionLabel: "Ashby ({{keyTitle}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Ashby → Admin → API Keys. Grant it the modules your workflow needs; read and write " +
        "are separate, and confidential-job access is off by default.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // The key is the username and the password is empty — a colon with nothing
    // after it, which is easy to get wrong by omitting the colon entirely.
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:`)}`;
    request.headers["accept"] = API_VERSION;
    return request;
  },

  /**
   * `POST /apiKey.info` — the one call that reports what the key can actually
   * do, rather than only that it exists.
   *
   * It needs the `apiKeysRead` scope itself, which a perfectly good key may not
   * have. So a refusal there falls back to `source.list` — cheap, read-only,
   * and enough to prove the credential works — and says that the scopes could
   * not be read rather than pretending the key is broken.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const headers = {
      authorization: `Basic ${btoa(`${apiKey}:`)}`,
      accept: API_VERSION,
      "content-type": "application/json",
    };

    const call = async (endpoint: string) => {
      const res = await ctx.fetch(`${BASE_URL}/${endpoint}`, {
        method: "POST",
        headers,
        body: "{}",
      });
      const text = await res.text().catch(() => "");
      let body: {
        success?: boolean;
        results?: { title?: string; scopes?: string[] };
        errorInfo?: { message?: string };
      } = {};
      try {
        body = JSON.parse(text || "{}");
      } catch { /* Ashby answers 401/403 in plain text */ }
      return { status: res.status, body };
    };

    const info = await call("apiKey.info");
    if (info.status === 401) return { ok: false, message: "Ashby received no API key" };
    if (info.status === 403 || info.body?.success === false) {
      // The key may simply lack `apiKeysRead`. Prove it works another way.
      const fallback = await call("source.list");
      if (fallback.status === 401 || fallback.status === 403) {
        return {
          ok: false,
          message: "Ashby rejected this API key — it may be deactivated, or have no module " +
            "permissions at all",
        };
      }
      if (fallback.body?.success === false) {
        return {
          ok: false,
          message: fallback.body?.errorInfo?.message ?? "Ashby refused a read with this key",
        };
      }
      return {
        ok: true,
        message: "connected, but the key cannot read its own permissions (no `apiKeysRead` " +
          "scope) — so its scopes could not be checked here",
      };
    }
    if (info.status !== 200) {
      return { ok: false, message: `Ashby returned ${info.status}` };
    }

    const results = info.body?.results ?? {};
    const scopes = results.scopes ?? [];
    const title = results.title ?? "unnamed key";
    return {
      ok: true,
      message: scopes.length > 0
        ? `connected as "${title}" with ${scopes.length} scopes: ${scopes.join(", ")}`
        : `connected as "${title}", which has no scopes granted — every action will be refused`,
    };
  },

  /** Records the key's title and scopes. Never the key. */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    try {
      const res = await ctx.fetch(`${BASE_URL}/apiKey.info`, {
        method: "POST",
        headers: {
          authorization: `Basic ${btoa(`${apiKey}:`)}`,
          accept: API_VERSION,
          "content-type": "application/json",
        },
        body: "{}",
      });
      if (!res.ok) {
        await res.body?.cancel();
        return {};
      }
      const body = await res.json().catch(() => null) as
        | { success?: boolean; results?: { title?: string; scopes?: string[] } }
        | null;
      if (body?.success === false) return {};
      return {
        keyTitle: body?.results?.title ?? "Ashby",
        scopes: body?.results?.scopes ?? [],
      };
    } catch {
      return {};
    }
  },
};

export default apiKey;
