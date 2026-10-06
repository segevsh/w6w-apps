import type { AuthDefinition } from "@w6w/types";
import { API_URL, type DubErrorBody } from "../lib/client.ts";

/**
 * API key — Dub's REST API takes `Authorization: Bearer dub_xxxxxx`. Keys are
 * workspace-scoped and may be restricted to a subset of resources.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a key at app.dub.co → Settings → API Keys. Sent as `Authorization: Bearer <key>`. A key is tied to one workspace.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "dub_xxxxxxxx",
      hint:
        "app.dub.co → Settings → API Keys. Restricted keys only reach the resources they were granted.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${key}`;
    return request;
  },

  /**
   * Probe: `GET /links?pageSize=1`. Dub has no whoami endpoint. The response is
   * the workspace's links (never the key). The verdict is read from the BODY:
   * a missing and a wrong key are both HTTP 401 and differ only in
   * `error.message`. A 403 `forbidden` proves the key was recognised but is
   * restricted away from links, which is a working credential.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/links?pageSize=1`, {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Dub API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Dub */ }
    const err = (body as DubErrorBody | null)?.error;

    if (res.ok) {
      return Array.isArray(body) ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /links — not a link array`,
      };
    }
    if (!err) {
      return {
        ok: false,
        message:
          `Dub returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    if (err.code === "forbidden") return { ok: true };
    if (res.status >= 500) {
      return { ok: false, message: `Dub is erroring (${res.status}): ${err.message ?? ""}` };
    }
    return { ok: false, message: err.message ?? err.code ?? `Dub returned ${res.status}` };
  },
};

export default apiKey;
