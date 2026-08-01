/**
 * Is this connection's ServiceNow instance reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — ServiceNow publishes no machine-readable status
 *     (which is why `service` is declared `unavailable`), and there is no
 *     single platform to report on anyway. The one thing that can be probed
 *     automatically is whether THIS connection's instance answers.
 *   - `scope: "connection"` — every Connection points at a different
 *     instance host.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.service-now.com` is already on the
 *     app's allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * The probe is deliberately unauthenticated, so a **401** is a pass: it
 * proves the instance resolves, TLS terminates, and the Table API is
 * answering — which is exactly what this check is for. Whether the
 * credential itself is any good is the derived `auth:*` check's job, and
 * conflating the two is how "the instance was cloned/rebuilt" gets
 * misreported as "your password expired". Only a transport failure (the hook
 * throws), a 404 (instance gone) or a 5xx counts as down.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Instance reachable",
  description:
    "Unauthenticated request to this connection's ServiceNow instance. A 401 passes — it proves the instance is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { instance?: string };
    if (!display.instance) {
      return { state: "unknown", message: "connection records no instance" };
    }

    const res = await ctx.fetch(
      `${baseUrl(display.instance)}/api/now/table/sys_user_role?sysparm_limit=1`,
    );
    if (res.status === 404) {
      return { state: "down", message: "instance not found — it may have been retired" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `instance returned ${res.status}` };
    }
    // 200 and 401 both mean the instance is serving. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default instance;
