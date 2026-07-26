/**
 * Is this org's Salesforce instance up? — Salesforce Trust.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) or "is there quota left" (the `limits-get` Action, promoted into
 *     the health surface by a `healthCheck` tag).
 *   - `scope: "connection"`, NOT the `app` default. Salesforce reports status
 *     per INSTANCE, not per platform, and an incident normally hits one
 *     instance rather than all of Salesforce. Sharing one verdict across every
 *     Connection would report an NA-instance outage against an EU org.
 *   - `credential: "context"` — the posture a boolean would lose. This check
 *     needs the Connection to know WHICH instance to ask about, and needs no
 *     credential to interpret the answer. `sign` must not run: Trust is a
 *     third-party host from the credential's point of view.
 *   - `network.allow` — api.status.salesforce.com is not on the app's egress
 *     allowlist (`status.salesforce.com/api/...` refuses direct access, so this
 *     is the host to use). Widening it for this one hook is permitted precisely
 *     because the posture is unsigned; the spec forbids the pairing with
 *     `signed`, which is what keeps the credential off a third-party host.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * Known limitation, stated rather than hidden: the instance key is derived from
 * the instance URL's first label, which works for classic hostnames (`na123`,
 * `eu45`) but not for My Domain hostnames (`acme.my.salesforce.com`), where the
 * label is the customer's domain and Trust will not know it. That case reports
 * `unknown` with a reason — never `ok`, which would be a lie, and never `down`,
 * which would be a different lie.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "api.status.salesforce.com";

/** Trust's instance status vocabulary, mapped onto our four states. */
const STATUS: Record<string, HealthState> = {
  OK: "ok",
  INFORMATIONAL: "ok",
  MINOR_INCIDENT_CORE: "degraded",
  MAJOR_INCIDENT_CORE: "down",
  MINOR_INCIDENT_NONCORE: "degraded",
  MAJOR_INCIDENT_NONCORE: "degraded",
  MAINTENANCE_CORE: "degraded",
  MAINTENANCE_NONCORE: "ok",
  UNPLANNED_MAINTENANCE_CORE: "down",
};

const service: HealthCheckDefinition = {
  key: "service",
  title: "Salesforce instance status",
  description:
    "Salesforce Trust status for the instance this connection lives on. Per-instance, because that is the granularity an incident actually has.",
  kind: "service",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { instanceUrl?: string };
    if (!display.instanceUrl) {
      return { state: "unknown", message: "connection records no instance URL" };
    }

    let label: string;
    try {
      label = new URL(display.instanceUrl).hostname.split(".")[0];
    } catch {
      return { state: "unknown", message: "connection's instance URL is not a URL" };
    }

    // Classic instance keys are alphanumeric and short (`na123`, `eu45`, `cs7`).
    // A My Domain host puts the customer's name here instead, and Trust has no
    // record of it — say so rather than guessing.
    const key = label.toUpperCase();
    const res = await ctx.fetch(`https://${STATUS_HOST}/v1/instances/${key}/status`);
    if (res.status === 404) {
      return {
        state: "unknown",
        message:
          `Trust knows no instance "${key}" — a My Domain host hides the instance key, so status cannot be resolved from the connection alone`,
      };
    }
    // `unknown`, never `down`: a Trust API that itself fails tells us nothing
    // about the instance, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `Trust returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: string;
      Incidents?: Array<{ IncidentImpacts?: Array<{ severity?: string }> }>;
    };
    if (!body.status) return { state: "unknown", message: "Trust returned no status" };

    return {
      state: STATUS[body.status] ?? "degraded",
      message: `instance ${key}: ${body.status}`,
      components: { [key.toLowerCase()]: { state: STATUS[body.status] ?? "degraded" } },
      ttlSeconds: 120,
    };
  },
};

export default service;
