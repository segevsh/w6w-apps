/**
 * Is **this connection's** Documenso reachable, and are its own checks passing?
 *
 * Documenso publishes `GET /api/health` unauthenticated, and it is unusually
 * informative for a health endpoint. Measured against `app.documenso.com`
 * 2026-08-18:
 *
 *   {"status":"ok","timestamp":"…","checks":{
 *      "database":{"status":"ok"},"certificate":{"status":"ok"}}}
 *
 * **The `certificate` check is the one worth surfacing.** Documenso signs PDFs
 * with a certificate, and a self-hosted instance has to supply its own — an
 * expired or missing one means signing fails while everything else looks
 * perfectly healthy. That is exactly the failure a monitoring check should
 * catch before a workflow does.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at working",
 *     which for a self-hostable product is a different question from "is the
 *     vendor up" and from "is the key live".
 *   - `scope: "connection"` — a self-hosted instance and the cloud are
 *     different servers.
 *   - `credential: "context"` — the Connection supplies the URL, and `/health`
 *     needs no key. Reading it unsigned means an expired key cannot make a
 *     healthy instance look down.
 *
 * No `network.allow`: the instance host is the app's own allowlist, which is
 * `["*"]` because only the operator knows a self-hosted address.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrlFromConnection } from "../lib/client.ts";

interface Health {
  status?: string;
  checks?: Record<string, { status?: string }>;
}

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Documenso instance health",
  description:
    "This connection's own server, via its unauthenticated /api/health endpoint — including " +
    "the signing certificate check, which fails silently everywhere else.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const base = baseUrlFromConnection(ctx.connection);

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/health`, { headers: { accept: "application/json" } });
    } catch (err) {
      // A server that cannot be reached at all IS the failure this check is for.
      return { state: "down", message: `instance unreachable: ${String(err)}` };
    }
    if (!res.ok) {
      return { state: "down", message: `/api/health returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as Health | null;
    if (!body?.status) {
      return { state: "degraded", message: "the health endpoint answered an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const failing: string[] = [];
    for (const [name, check] of Object.entries(body.checks ?? {})) {
      const ok = check?.status === "ok";
      components[name] = { state: ok ? "ok" : "down", message: check?.status };
      if (!ok) failing.push(`${name}: ${check?.status ?? "unknown"}`);
    }

    if (failing.length > 0) {
      // A failing certificate check means signing is broken even though the
      // app answers every other request normally.
      return { state: "down", message: failing.join("; "), components };
    }
    if (body.status !== "ok") {
      return { state: "degraded", message: `health reported ${body.status}`, components };
    }
    return {
      state: "ok",
      message: `ok (${Object.keys(components).join(", ") || "no sub-checks"})`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default instance;
