import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Toggl documents API quotas (Free: 30 req/hr per user per workspace,
 * Starter: 240, Premium: 600, higher on Enterprise; a separate 30 req/hr
 * limit on user-scoped endpoints like `/me`) but publishes no proactive
 * headroom to read ahead of time — verified directly against Toggl's own
 * "API & Webhook limits" article (support.toggl.com/api-webhook-limits,
 * updated 2026-06-16): a sliding-window counter enforced server-side, with
 * **no documented response headers** exposing remaining/reset values. The
 * only signal is reactive — an HTTP 402 once the quota is already exhausted
 * (note: 402, not the more common 429) — so there is nothing to probe
 * *before* that happens.
 *
 * Declared rather than omitted, for the same reason as an absent status
 * service: a host should be able to tell "we cannot know" from "nobody
 * looked". `severity: "informational"` — an `unavailable` entry reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Toggl publishes no rate-limit response headers or headroom endpoint. Quotas are " +
      "enforced with a sliding-window counter per user per workspace (30-600 requests/hour " +
      "depending on plan) and only surface reactively, as an HTTP 402 once exhausted.",
  },
};

export default quota;
