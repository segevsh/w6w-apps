import type { HealthCheckDefinition } from "@w6w/types";
import { serviceFromConnection } from "../lib/client.ts";

/**
 * Is this connection's PDS answering?
 *
 * ## Why it is per-connection and not per-app
 *
 * The AT Protocol is federated. `bsky.social` is the PDS most accounts use, but
 * a connection may point at somebody's own server, and Bluesky's own hosting is
 * itself split across many `*.host.bsky.network` instances. "Is Bluesky up" is
 * not a question with one answer; "is the host this account lives on
 * answering" is.
 *
 * ## `describeServer` needs no credential, on purpose
 *
 * It reports what the server is and what it allows, and it takes no auth — so
 * a rejected or expired token does not read as an outage. That separation is
 * the point: the session's own health is the derived `auth:app-password`
 * check's job, and conflating them means a routine token expiry looks like the
 * server has gone.
 */
const pds: HealthCheckDefinition = {
  key: "pds",
  title: "PDS reachable",
  description:
    "Whether the server this account lives on is answering. Unauthenticated, so an expired " +
    "session does not read as an outage.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let service: string;
    try {
      service = serviceFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "this connection's PDS URL will not parse" };
    }
    const host = new URL(service).host;

    let res: Response;
    try {
      res = await ctx.fetch(`${service}/xrpc/com.atproto.server.describeServer`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `${host} did not answer: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      return { state: "down", message: `${host} answered ${res.status}` };
    }

    let body: { did?: string; availableUserDomains?: string[] } | null = null;
    try {
      body = JSON.parse(text) as { did?: string; availableUserDomains?: string[] };
    } catch {
      // An HTML body from an edge proxy means something is in front of the PDS
      // that is not the PDS.
      return {
        state: "degraded",
        message: `${host} answered with a non-JSON body — something in front of the PDS is ` +
          "handling this request",
      };
    }
    if (!body?.did) {
      return { state: "degraded", message: `${host} answered, but not as an AT Protocol server` };
    }

    return {
      state: "ok",
      message: `${host} is answering as ${body.did}`,
      ttlSeconds: 120,
    };
  },
};

export default pds;
