import type { HealthCheckDefinition } from "@w6w/types";

/**
 * NerdGraph reports no remaining headroom anywhere in a response.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "NerdGraph returns no rate-limit headers. Verified 2026-08-18 by reading the full response " +
      "headers from api.newrelic.com/graphql and api.eu.newrelic.com/graphql: no X-RateLimit " +
      "family, no Retry-After, and nothing in the GraphQL response body either. New Relic does " +
      "apply limits — NRQL queries are bounded per minute per account, and an over-limit query " +
      "returns an error in the GraphQL `errors` array inside an HTTP 200, which the client " +
      "surfaces — but the remaining allowance is not published anywhere a check could read it. " +
      "The consumption that actually matters commercially is not requests at all: New Relic " +
      "bills on data INGESTED (gigabytes) and on billable users, neither of which this " +
      "connection's key affects. Those figures are queryable with NRQL against " +
      "NrConsumption and NrMTDConsumption, which is a deliberate reporting question for a " +
      "workflow rather than a health check — `nrql-query` is how to ask it.",
  },
};

export default quota;
