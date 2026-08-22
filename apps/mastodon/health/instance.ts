import type { HealthCheckDefinition } from "@w6w/types";
import { type MastodonConnectionDisplay, normalizeUrl } from "../lib/client.ts";

/**
 * Is this instance answering, and has anything about it changed?
 *
 * ## Unauthenticated on purpose
 *
 * `/api/v2/instance` needs no token, so "is the server up" stays a separate
 * question from "is the token good" — the derived `auth:access-token` check
 * owns the second, and a revoked token should not read as an outage.
 *
 * ## It also watches for the limits moving
 *
 * The character and media limits are recorded on the connection at connect
 * time, and every post is checked against them. An instance that raises its
 * limit makes that recorded value wrong in the harmless direction; one that
 * *lowers* it makes posts start failing with a 422 that this app would have
 * predicted incorrectly.
 *
 * Neither raises anything anywhere — a limit change is an admin editing a
 * config file. So the check compares and reports a difference, which is the
 * only way anybody finds out before a post is refused.
 */
const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Instance reachable",
  description:
    "Whether this instance answers, and whether its limits still match what was recorded. A " +
    "server changing its character limit announces it nowhere.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as MastodonConnectionDisplay;
    let base: string;
    try {
      base = normalizeUrl(display.url);
    } catch {
      return { state: "unknown", message: "this connection has no instance URL recorded" };
    }
    const host = new URL(base).hostname;

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/v2/instance`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `${host} did not answer: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      return {
        state: "down",
        message: `${host} answered ${res.status}. On a federated network this is one server, ` +
          "not the network",
      };
    }

    interface Instance {
      domain?: string;
      version?: string;
      configuration?: {
        statuses?: { max_characters?: number; max_media_attachments?: number };
      };
    }
    let body: Instance | null = null;
    try {
      body = JSON.parse(text) as Instance;
    } catch {
      return {
        state: "degraded",
        message: `${host} answered without JSON — usually a proxy or a landing page rather than ` +
          "a Mastodon instance",
      };
    }
    if (!body?.domain) {
      return { state: "degraded", message: `${host} answered, but not as a Mastodon instance` };
    }

    // A limit change is an admin editing a config file — nothing announces it.
    const nowMax = Number(body.configuration?.statuses?.max_characters ?? NaN);
    const wasMax = Number(display.maxCharacters ?? NaN);
    if (Number.isFinite(nowMax) && Number.isFinite(wasMax) && nowMax !== wasMax) {
      return {
        state: "degraded",
        message: `${host} now allows ${nowMax} characters, and this connection recorded ` +
          `${wasMax}. ${
            nowMax < wasMax
              ? "Posts between the two lengths will start being refused"
              : "Longer posts are available than this connection will attempt"
          } — reconnect to pick up the new limit`,
        ttlSeconds: 300,
      };
    }

    return {
      state: "ok",
      message: `${body.domain} is answering, running ${body.version ?? "an unknown version"}`,
      ttlSeconds: 300,
    };
  },
};

export default instance;
