/**
 * Is the GraphQL endpoint for THIS connection's environment answering?
 *
 * An unsigned `query { ping }` gets HTTP 200 and a GraphQL error whose
 * `extensions.errorClass` is `AUTHENTICATION` ("Authentication credentials are missing...").
 * Measured 2026-10-06 on both hosts. That schema-correct error proves DNS, TLS, the CDN and
 * Braintree's gateway ran, so it is a PASS; whether the keys are good is the derived
 * `auth:api-keys` check's job. An HTML body (a CDN or error shell) or a 5xx is `down`.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { endpoint, type GraphQLResponse, isAuthError, resolveEnvironment } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "GraphQL API reachable",
  description:
    "Unauthenticated `query { ping }` against this connection's environment. Braintree's documented AUTHENTICATION error is the expected healthy answer; credential validity is the `auth:api-keys` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const env = resolveEnvironment(ctx.connection);
    let res: Response;
    try {
      res = await ctx.fetch(endpoint(env), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ query: "query { ping }" }),
      });
    } catch (e) {
      return { state: "down", message: `could not reach the ${env} endpoint: ${e}` };
    }
    const raw = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the ${env} API` };
    }
    if (/text\/html/i.test(res.headers.get("content-type") ?? "") || /^\s*</.test(raw)) {
      return { state: "down", message: `HTML answer from the ${env} API (HTTP ${res.status})` };
    }
    let body: GraphQLResponse<{ ping?: string }> | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* falls through to unknown */ }
    if (body?.data?.ping === "pong" || isAuthError(body)) {
      return { state: "ok", message: `${env} GraphQL API is serving`, ttlSeconds: 60 };
    }
    const sa = (body?.errors ?? []).find((e) =>
      e.extensions?.errorClass === "SERVICE_AVAILABILITY"
    );
    if (sa) return { state: "down", message: sa.message ?? "SERVICE_AVAILABILITY" };
    return {
      state: "unknown",
      message: `unrecognised answer (HTTP ${res.status}): ${raw.slice(0, 120)}`,
    };
  },
};

export default api;
