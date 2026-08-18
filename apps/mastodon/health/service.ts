import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Mastodon up? — the question does not have an answer, and that is the
 * interesting part.
 *
 * There is no Mastodon service. There are thousands of independently operated
 * servers running the same software, each with its own uptime, its own admin
 * and its own outages. `joinmastodon.org` is a directory maintained by the
 * non-profit that develops the software; it publishes no status feed because it
 * has nothing to report — it does not run the network.
 *
 * Some large instances publish their own status pages, at addresses only their
 * operators know. There is no registry of them, no convention for where they
 * live, and no way for this app to find the one belonging to whichever server a
 * connection points at.
 *
 * So the vendor-level question is genuinely unanswerable here, and the honest
 * thing is to say so rather than to invent a probe. What *can* be answered is
 * whether the one instance a connection uses is up, which is exactly what the
 * `instance` check does — per connection, against that server.
 *
 * This is a different shape of absence from the usual one in this pack. Most
 * declared absences say "the vendor publishes nothing machine-readable". This
 * one says there is no vendor.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Mastodon service status",
  kind: "service",
  covers: ["*"],
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason:
      "There is no Mastodon service to have a status. Mastodon is software that thousands of " +
      "people run independently, so a connection reaches ONE server with its own uptime, its " +
      "own operator and its own outages — and an outage on any of them is not an outage of " +
      "anything else. joinmastodon.org is a directory maintained by the non-profit that develops " +
      "the software, verified 2026-08-18; it publishes no status feed because it does not run " +
      "the network. Individual large instances do publish status pages, but at addresses only " +
      "their operators know, with no registry and no convention for finding the one belonging " +
      "to a given server. This is therefore not a vendor that publishes nothing — it is an app " +
      "with no vendor. The `instance` dependency check answers the question that does exist: " +
      "whether the specific server this connection uses is answering, and whether its limits " +
      "have changed.",
  },
};

export default service;
