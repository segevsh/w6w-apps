import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no rate-limit headroom signal exists — a positive fact.
 *
 * The API docs mention a rate limit (as the reason to use `background_request=true`) but publish
 * no number, no rate-limit response header and no usage endpoint; the only stated figure is that
 * creating or retargeting a message is limited to one call per 30 seconds. That is a documentation
 * read plus unsigned responses, not a measurement of a signed one.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Action Network documents no rate-limit number, header or usage endpoint (only a " +
      "one-per-30-seconds limit on creating messages), so there is no headroom to read.",
  },
};

export default quota;
