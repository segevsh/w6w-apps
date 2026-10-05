import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Salesmsg publishes a status page, but not one that speaks about the API.
 *
 * `https://status.salesmessage.com` is a real Statping install ("Salesmsg Status Page", read live
 * 2026-10-05; `GET /api` answers its own `domain`, and `GET /api/services` is machine-readable).
 * It monitors eleven services: `AVG Platform Response Time`, `SMS`, `Broadcasts`, `Calls`, and
 * seven integrations (HubSpot, Salesforce, ActiveCampaign, Keap, PipeDrive, Zapier, Make). None is
 * the public API `api.salesmessage.com/pub/v2.3`; `SMS` is the nearest and nothing on the page says
 * what it probes. Two of the eleven are stale (`Calls` last updated 2025-10-29, `AVG Platform
 * Response Time` 2026-07-11). Reading `SMS` as a statement about this app's host would be inferring
 * a coverage the vendor never claimed, so the absence is declared instead.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Salesmsg API status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.salesmessage.com is a real Statping page, but none of its eleven services is the " +
      "public API (api.salesmessage.com/pub/v2.3): it lists SMS, Broadcasts, Calls, " +
      "AVG Platform Response Time and seven CRM/automation integrations. Nothing on the page " +
      "says what the SMS service probes, so it is not read as a statement about this API.",
  },
};

export default service;
