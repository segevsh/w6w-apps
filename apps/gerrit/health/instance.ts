import type { HealthCheckDefinition } from "@w6w/types";
import { hostFromConnection, stripMagicPrefix } from "../lib/client.ts";

/**
 * `GET /config/server/version` on this connection's own Gerrit —
 * unauthenticated, and at the **bare** path.
 *
 * ## The one place this app deliberately does not use `/a/`
 *
 * Every action uses `/a/` so that a broken credential fails rather than
 * silently returning the anonymous view. A health check wants the opposite: an
 * unauthenticated probe answers "is Gerrit there", which a signed one cannot
 * separate from "is the password still valid".
 *
 * Verified live: the bare `/config/server/version` answers 200 with
 * `)]}'` followed by a JSON string, on a Gerrit that refuses `/a/` requests
 * without a credential.
 *
 * ## It also reports the version, which matters more here than usual
 *
 * Gerrit is software people run, across versions spanning years. An endpoint
 * that exists in 3.9 and not in 3.4 fails as a 404 that reads like a wrong
 * path, so knowing the version is knowing which half of the documentation
 * applies.
 *
 * ## The magic prefix makes an unparsed body the first symptom
 *
 * If something in front of Gerrit — a proxy, an SSO gateway — answers instead,
 * the body is HTML and there is no prefix. That is a much more precise signal
 * than a status code, and this check reads it.
 */
const check: HealthCheckDefinition = {
  key: "instance",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  title: "Gerrit instance reachable",
  description:
    "Probes this connection's Gerrit at the UNAUTHENTICATED bare path — the one place this app " +
    "does not use `/a/` — so an outage cannot be confused with an expired HTTP password. " +
    "Reports the version, and detects a proxy answering by the absence of the magic prefix.",
  covers: ["dependency", "service"],
  severity: "fatal",
  minIntervalSeconds: 60,
  network: { allow: ["*"] },

  async check(_input, ctx) {
    let host: string;
    try {
      host = hostFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String(err) };
    }

    const started = Date.now();
    let res: Response;
    try {
      // Deliberately not `/a/`: this asks about Gerrit, not the credential.
      res = await ctx.fetch(`${host}/config/server/version`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${new URL(host).host}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const raw = await res.text().catch(() => "");

    if (res.status >= 500) {
      return { state: "down", message: `Gerrit answered ${res.status}`, latencyMs };
    }
    if (!res.ok) {
      return {
        state: "degraded",
        message: `${new URL(host).host} answered ${res.status} to an unauthenticated version ` +
          "request — on a Gerrit behind an SSO gateway even this endpoint can be closed",
        latencyMs,
      };
    }

    // No magic prefix means something other than Gerrit answered.
    if (!raw.startsWith(")]}'")) {
      return {
        state: "degraded",
        message: "the response carried no `)]}'` prefix, so something other than Gerrit answered " +
          "— most likely a proxy or an SSO login page",
        latencyMs,
      };
    }

    let version = "";
    try {
      version = JSON.parse(stripMagicPrefix(raw)) as string;
    } catch { /* the prefix was right; the body shape is a detail */ }

    return {
      state: "ok",
      message: `${new URL(host).host} is running Gerrit ${version || "(version unreported)"}`,
      latencyMs,
    };
  },
};

export default check;
