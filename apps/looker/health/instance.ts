import type { HealthCheckDefinition } from "@w6w/types";
import { describeError, hostFromConnection } from "../lib/client.ts";

/**
 * Is *this* Looker reachable, and is the credential still working?
 *
 * ## It has to be signed, and Looker gives no alternative
 *
 * There is no unauthenticated endpoint on a Looker instance that reports
 * health. So this cannot fully separate "Looker is down" from "the token
 * expired" — and rather than pretending otherwise, it says which a given
 * failure looks like, using the things that do distinguish them.
 *
 * ## The token lasts an hour, so a 401 is usually not a revocation
 *
 * Looker access tokens expire in an hour and the runtime refreshes them. A 401
 * here is more often a refresh that did not happen than a credential somebody
 * removed, and the message says so rather than implying the worse case.
 *
 * ## A connection failure on a self-hosted Looker is usually the port
 *
 * Self-hosted Looker serves its API on **19999**, and its web interface
 * elsewhere. A URL that works in a browser refuses the connection here, which
 * looks like the instance being down. That is worth naming, because it is the
 * commonest setup mistake and it presents as an outage.
 *
 * ## A disabled user authenticates and can do nothing
 *
 * Looker will issue a token for a disabled account and refuse every query it
 * makes. Nothing about that reads as a user problem, so the check looks.
 */
const check: HealthCheckDefinition = {
  key: "instance",
  kind: "dependency",
  scope: "connection",
  credential: "signed",
  title: "Looker instance reachable",
  description:
    "Reaches this connection's own Looker. Signed, because Looker offers no unauthenticated " +
    "health endpoint — so it names which failure a given error looks like, including the " +
    "SELF-HOSTED port 19999, which presents as the instance being down.",
  covers: ["dependency", "credential"],
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
      res = await ctx.fetch(`${host}/api/4.0/user`, { headers: { accept: "application/json" } });
    } catch (err) {
      // On self-hosted Looker this is nearly always the port.
      return {
        state: "down",
        message: `could not reach ${host}: ${String(err)}. On a SELF-HOSTED Looker the API is on ` +
          "port 19999 while the web interface is elsewhere, so a URL that works in a browser " +
          "refuses the connection here and looks like an outage",
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");

    if (res.status === 401) {
      return {
        state: "down",
        message: `${describeError(401, text)}. A Looker token lasts an hour, so this is more ` +
          "often a refresh that did not happen than a credential somebody removed",
        latencyMs,
      };
    }
    if (!res.ok) {
      return {
        state: res.status >= 500 ? "down" : "degraded",
        message: describeError(res.status, text),
        latencyMs,
      };
    }

    interface LookerUser {
      display_name?: string;
      is_disabled?: boolean;
    }
    let user: LookerUser | null = null;
    try {
      user = JSON.parse(text) as LookerUser;
    } catch {
      return {
        state: "degraded",
        message: `${host} answered without JSON — for a self-hosted Looker this usually means ` +
          "the URL is reaching the web interface rather than the API on port 19999",
        latencyMs,
      };
    }

    if (user?.is_disabled) {
      // A token is issued and every query is refused.
      return {
        state: "down",
        message: "the instance is reachable and this credential's Looker user is DISABLED — the " +
          "token is issued normally and every query will be refused",
        latencyMs,
      };
    }

    return {
      state: "ok",
      message: `${new URL(host).host} answered as ${user?.display_name ?? "the connected user"}`,
      latencyMs,
    };
  },
};

export default check;
