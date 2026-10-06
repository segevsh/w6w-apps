/**
 * Is the ServiceTitan API gateway answering for THIS connection's environment?
 *
 * `service` is about ServiceTitan the company; this asks whether the gateway
 * for the environment the connection targets (`api.servicetitan.io` or
 * `api-integration.servicetitan.io`) is serving.
 *
 * The probe is deliberately unsigned. Verified live 2026-10-06 against both
 * hosts: an unsigned `GET /crm/v2/tenant/1/customers` answers `401` with an RFC
 * 7807 body whose `title` is "Application key not present, check ST-App-Key
 * header value." — proof the gateway terminated TLS and ran its own pipeline.
 * That schema-correct 401 is therefore a **pass**; whether the credential is
 * any good is the derived `auth:*` check's job. An unknown path on the root
 * (`GET /`) answers `404` with the same ProblemDetails shape, so the probe
 * demands the ProblemDetails `title`/`status` fields rather than trusting a
 * bare status code (a CDN error page is HTML, a 5xx is an outage).
 *
 * `credential: "context"` — it needs the Connection to choose the host, and
 * no credential; `sign` must not run.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { HOSTS, parseEnvironment } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API gateway reachable",
  description:
    "Unsigned request to this connection's ServiceTitan API host. A 401 ProblemDetails " +
    "response ('Application key not present') passes — it proves the gateway is serving.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  network: { allow: ["api.servicetitan.io", "api-integration.servicetitan.io"] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { environment?: string };
    const host = HOSTS[parseEnvironment(display.environment)].api;

    const res = await ctx.fetch(`${host}/crm/v2/tenant/1/customers?pageSize=1`, {
      headers: { accept: "application/json" },
      redirect: "manual",
    });
    if (res.status >= 500) {
      return { state: "down", message: `ServiceTitan API returned ${res.status}` };
    }
    if (res.status >= 300 && res.status < 400) {
      return { state: "down", message: "ServiceTitan API redirected instead of answering" };
    }
    const text = await res.text().catch(() => "");
    let problem: { title?: unknown; status?: unknown } | null = null;
    try {
      problem = JSON.parse(text);
    } catch {
      problem = null;
    }
    if (!problem || typeof problem.title !== "string" || typeof problem.status !== "number") {
      return {
        state: "unknown",
        message: `ServiceTitan API answered ${res.status} without its ProblemDetails shape`,
      };
    }
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default api;
