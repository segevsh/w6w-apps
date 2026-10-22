import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrlFromConnection, describeError, isPrivateHost } from "../lib/client.ts";

/**
 * Is this connection's Ollama server answering? — `GET /api/version`.
 *
 * ## Why this is the one real check
 *
 * There is no vendor to ask (see `service.ts`), so "is it up" is per server.
 * `/api/version` is the lightest call Ollama has: no model is loaded and nothing
 * is listed, so probing it every couple of minutes costs the server nothing.
 *
 * ## Signed, with an optional key
 *
 * The probe goes through the auth `sign` hook, which adds `Authorization` only
 * when an API key was entered. A bare server is probed bare; one behind a
 * reverse proxy is probed with its key. A 401/403 is `unknown`, not `down`: the
 * derived `auth:server` check owns credential failures, and a rejected key is
 * not an outage.
 *
 * ## A body that is not Ollama's is `degraded`
 *
 * A proxy's login page or an unrelated service on the same port answers 200
 * without a `version`. The host is reachable and the thing behind it is not
 * Ollama, which is a different fix from "down".
 */
const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Ollama server reachable",
  description:
    "Whether this connection's Ollama server answers GET /api/version. A free call: no model " +
    "is loaded to answer it.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let base: string;
    try {
      base = baseUrlFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "this connection has no Ollama host recorded" };
    }
    const target = new URL(base);

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/version`, { headers: { accept: "application/json" } });
    } catch (err) {
      const where = isPrivateHost(target.hostname.replace(/^\[|\]$/g, ""))
        ? " — a private address is only reachable from a runner on the same network"
        : "";
      return {
        state: "down",
        message: `${target.host} did not answer: ${String((err as Error)?.message ?? err)}${where}`,
      };
    }
    const text = await res.text().catch(() => "");

    if (res.status === 401 || res.status === 403) {
      return { state: "unknown", message: "the proxy in front of Ollama rejected the API key" };
    }
    if (!res.ok) {
      return { state: "down", message: `${target.host}: ${describeError(res.status, text)}` };
    }

    let version: unknown;
    try {
      version = (JSON.parse(text) as { version?: unknown }).version;
    } catch { /* not JSON */ }
    if (typeof version !== "string") {
      return {
        state: "degraded",
        message: `${target.host} answered but not like Ollama (no version in /api/version) — ` +
          "a proxy or login page, or another service on that port",
      };
    }
    return { state: "ok", message: `Ollama ${version} at ${target.host}`, ttlSeconds: 120 };
  },
};

export default instance;
