/**
 * Is this connection's Databricks workspace reachable?
 *
 * Same posture as Zendesk's `account` check: `kind: "dependency"`,
 * `scope: "connection"` (every Connection points at a different workspace
 * host), `credential: "context"` (needs the Connection to know which host to
 * call, no credential needed to interpret the answer — `sign` must not run).
 *
 * The probe is deliberately unauthenticated, so a **401 is a pass**: it
 * proves the host resolves and the API is answering. Whether the credential
 * is any good is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const workspace: HealthCheckDefinition = {
  key: "workspace",
  title: "Workspace reachable",
  description:
    "Unauthenticated request to this connection's Databricks workspace host. A 401 passes — " +
    "it proves the workspace is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { workspaceUrl?: string };
    if (!display.workspaceUrl) {
      return { state: "unknown", message: "connection records no workspaceUrl" };
    }

    const res = await ctx.fetch(`${display.workspaceUrl}/api/2.0/preview/scim/v2/Me`);
    if (res.status === 404) {
      return { state: "down", message: "workspace not found — the URL may be wrong or the workspace deleted" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `workspace returned ${res.status}` };
    }
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default workspace;
