/**
 * Is this connection's Supabase project reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — every project runs on its own host
 *     (`<ref>.supabase.co`); this asks whether THIS one is up, independent of
 *     both the shared-platform `service` check and the credential.
 *   - `scope: "connection"` — every Connection points at a different project.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.supabase.co` is already on the app's
 *     allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind. Whether the credential
 *     itself still works is the derived `auth:*` check's job.
 *
 * The probe is deliberately unauthenticated — no `apikey` header — so a
 * **401 is a pass**: Supabase's gateway answers 401 "No API key found in
 * request" for exactly this request (confirmed against multiple first-hand
 * reports, e.g. https://github.com/orgs/supabase/discussions/16241), which
 * proves the project's host resolves, TLS terminates, and the gateway is
 * serving — precisely what this check is for. Whether the credential is any
 * good is the `auth:*` check's job; conflating the two would misreport "the
 * project was paused/deleted" as "your API key is wrong". Only a transport
 * failure (the hook throws), a DNS-shaped 404, or a 5xx counts as down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { restUrl } from "../lib/client.ts";

const reachable: HealthCheckDefinition = {
  key: "reachable",
  title: "Project reachable",
  description:
    "Unauthenticated request to this connection's Supabase project host. A 401 passes — it " +
    "proves the gateway is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { projectUrl?: string };
    if (!display.projectUrl) {
      return { state: "unknown", message: "connection records no projectUrl" };
    }

    const res = await ctx.fetch(`${restUrl(display.projectUrl)}/`);
    if (res.status === 404) {
      return { state: "down", message: "project not found — it may have been paused or deleted" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `project returned ${res.status}` };
    }
    // 200 and 401 both mean the gateway is serving. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default reachable;
