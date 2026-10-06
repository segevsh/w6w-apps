import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl, hostFor } from "../lib/client.ts";

/**
 * Is this connection's Salesmate account host reachable?
 *
 * `kind: "dependency"`, `scope: "connection"`, `credential: "context"`: the
 * check needs the Connection to know WHICH `<linkname>.salesmate.io` to call
 * and needs no credential to interpret the answer, so `sign` never runs.
 * `*.salesmate.io` is already on the app's allowlist.
 *
 * The probe is unauthenticated, so the vendor's own `AuthorizationFailed`
 * (HTTP 403, measured live) is a PASS: it proves the host resolves and the API
 * is answering. Credential validity is the derived `auth:*` check's job.
 * Down: transport failure (the hook throws), a 404 / `NoSuchLinkExist` (the
 * link name no longer exists) or a 5xx.
 */
const domain: HealthCheckDefinition = {
  key: "domain",
  title: "Account host reachable",
  description:
    "Unauthenticated request to this connection's Salesmate host. An `AuthorizationFailed` " +
    "answer passes — it proves the account is serving; credential validity is the `auth:*` " +
    "check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { linkname?: string };
    if (!display.linkname) {
      return { state: "unknown", message: "connection records no link name" };
    }
    const res = await ctx.fetch(`${baseUrl(display.linkname)}/core/v4/users?status=active`, {
      headers: { "x-linkname": hostFor(display.linkname) },
    });
    const body = await res.json().catch(() => undefined) as
      | { Error?: { Name?: string; name?: string } }
      | undefined;
    const name = body?.Error?.Name ?? body?.Error?.name;
    if (res.status === 404 || name === "NoSuchLinkExist") {
      return { state: "down", message: "link name not found — the account may have been renamed" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `account host returned ${res.status}` };
    }
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default domain;
