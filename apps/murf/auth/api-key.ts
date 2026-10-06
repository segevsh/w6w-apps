import type { AuthDefinition } from "@w6w/types";
import { API_URL, codeOf, messageOf } from "../lib/client.ts";

/** Dubbing lives under this path and takes a different key than every other endpoint. */
const DUB_PATH = "/v1/murfdub/";

interface Credential {
  apiKey?: string;
  dubApiKey?: string;
}

/**
 * Murf API key(s), sent as the `api-key` header. The Murf Dub automation API is a separate
 * product with its OWN key (https://dub.murf.ai/api/manage-keys), so the connection holds both
 * and `sign` picks one by path. Either may be left empty if only one product is used.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Keys",
  description:
    "Speech API key from murf.ai/api/dashboard and, for dubbing, the separate Murf Dub key. Sent as the `api-key` header.",
  apiKey: { in: "header", name: "api-key" },
  fields: [
    {
      key: "apiKey",
      label: "Speech API key",
      type: "secret",
      hint:
        "Murf API dashboard key. Used for text-to-speech, voices, voice changer and translation.",
    },
    {
      key: "dubApiKey",
      label: "Murf Dub API key",
      type: "secret",
      hint:
        "Generate at dub.murf.ai/api/manage-keys. It is a different key from the speech key and is only needed for the dubbing actions.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: speech, dubApiKey: dub } = credential as Credential;
    let path = "";
    try {
      path = new URL(request.url).pathname;
    } catch { /* relative URL: treat as non-dubbing */ }
    const isDub = path.startsWith(DUB_PATH);
    const key = isDub ? dub : speech;
    if (!key) {
      throw new Error(
        isDub
          ? "this connection has no Murf Dub API key (dubbing uses a separate key)"
          : "this connection has no Speech API key",
      );
    }
    request.headers["api-key"] = key;
    return request;
  },

  /**
   * Probe: `GET /v1/speech/voices` (speech key) and `GET /v1/murfdub/list-source-languages` (dub
   * key) — public catalogue reads that never return a key. A missing, wrong and valid key are
   * told apart by the vendor's own `error_code` body, never the HTTP status alone (measured
   * 2026-10-06: wrong key is 403 on voices and murfdub but 401 on /v1/auth/token).
   */
  async test({ credential }, ctx) {
    const { apiKey: speech, dubApiKey: dub } = credential as Credential;
    if (!speech && !dub) return { ok: false, message: "credential has no API key" };

    const probes: Array<[string, string, string]> = [];
    if (speech) probes.push(["Speech", "/v1/speech/voices", speech]);
    if (dub) probes.push(["Murf Dub", "/v1/murfdub/list-source-languages", dub]);

    for (const [label, path, key] of probes) {
      let res: Response;
      try {
        res = await ctx.fetch(`${API_URL}${path}`, {
          headers: { "api-key": key, accept: "application/json" },
        });
      } catch (e) {
        return { ok: false, message: `could not reach the Murf API: ${e}` };
      }
      const raw = await res.text().catch(() => "");
      let body: unknown = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch { /* non-JSON: the request probably never reached Murf */ }

      if (res.ok && Array.isArray(body)) continue;
      const code = codeOf(body);
      if (code === 401 || code === 403 || res.status === 401 || res.status === 403) {
        return {
          ok: false,
          message: `Murf rejected the ${label} API key: ${messageOf(body) ?? res.status}`,
        };
      }
      if (res.status === 429) {
        return { ok: false, message: "Murf rate limited the probe; the key could not be verified" };
      }
      return {
        ok: false,
        message: `unexpected ${res.status} from GET ${path}${
          messageOf(body) ? `: ${messageOf(body)}` : ""
        }; the request may not have reached the API`,
      };
    }
    return { ok: true };
  },
};

export default apiKey;
