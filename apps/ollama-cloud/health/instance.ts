import type { HealthCheckDefinition } from "@w6w/types";
import { BASE_URL, describeError } from "../lib/client.ts";

/**
 * Is Ollama Cloud answering this key? — `GET /api/version`.
 *
 * ## Signed, because there is nothing to probe without a key
 *
 * The cloud has no anonymous surface: every call needs `Authorization`. So this
 * is a `credential: "signed"` probe and the auth `sign` hook puts the key on the
 * wire. It stays inside the app's own egress allowlist (`ollama.com`), which is
 * why the check declares no `network.allow` of its own.
 *
 * `/api/version` is the lightest call the API has — it generates nothing and
 * lists nothing — so probing it every couple of minutes costs nothing.
 *
 * ## A rejected key is `unknown`, not `down`
 *
 * The derived `auth:api-key` check owns credential failures; a 401 is not an
 * outage. A 5xx is: the vendor is reachable and answering badly.
 */
const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Ollama Cloud reachable",
  description: "Whether Ollama Cloud answers GET /api/version with this connection's API key.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const host = new URL(BASE_URL).host;
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/api/version`, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "down",
        message: `${host} did not answer: ${String((err as Error)?.message ?? err)}`,
      };
    }
    const text = await res.text().catch(() => "");

    if (res.status === 401 || res.status === 403) {
      return { state: "unknown", message: "Ollama Cloud rejected the API key" };
    }
    if (!res.ok) {
      return { state: "down", message: `${host}: ${describeError(res.status, text)}` };
    }

    let version: unknown;
    try {
      version = (JSON.parse(text) as { version?: unknown }).version;
    } catch { /* not JSON */ }
    if (typeof version !== "string") {
      return {
        state: "degraded",
        message: `${host} answered 200 but not with an Ollama version — a proxy or a login ` +
          "page is in the way",
      };
    }
    return { state: "ok", message: `Ollama Cloud ${version}`, ttlSeconds: 120 };
  },
};

export default instance;
