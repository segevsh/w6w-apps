import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Meta publishes a real, machine-readable outage feed for the WhatsApp
 * Business Platform at metastatus.com — verified 2026-07-31 by fetching it
 * directly: valid RSS 2.0 with a self-referencing `atom:link`, titled
 * "WhatsApp Business Platform Status".
 *
 *   https://metastatus.com/outage-events-feed-whatsapp-business-api.rss
 *
 * Its URL (`outage-events-feed-*`, not `status-history-*`) and its content at
 * verification time (zero `<item>`s, and every other Meta product's
 * equivalent feed was ALSO empty simultaneously) both point at a feed scoped
 * to *currently open* outage events rather than a running log of every
 * status change the way Mistral's or Slack's feeds are — those feeds keep a
 * "Status: Resolved" entry around after an incident closes and this RFC's
 * `latest` fold exists partly to handle that. Meta's feed gives no
 * machine-readable resolved/investigating vocabulary to key off, so an
 * entry's mere presence is read as "Meta itself is reporting something
 * about this product right now" rather than parsed for severity.
 */
const WABA_STATUS_FEED_URL = "https://metastatus.com/outage-events-feed-whatsapp-business-api.rss";

const service: HealthCheckDefinition = {
  key: "service",
  title: "WhatsApp Business Platform status",
  description: "Meta's own outage-events feed for the WhatsApp Business Platform.",
  kind: "service",
  covers: ["*"],
  feed: { url: WABA_STATUS_FEED_URL },
  minIntervalSeconds: 300,

  check({ feed }, _ctx) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = feed?.latest ?? [];
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };
    return {
      state: "degraded",
      message: open.map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
