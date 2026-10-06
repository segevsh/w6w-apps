import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no free quota read exists — a positive fact.
 *
 * Checked 2026-10-06 against the OpenAPI document (`/api/docs/openapi.json`, 18 operations):
 * the only place a balance appears is `remainingCharacterCount` / `remaining_character_count` on
 * the Synthesize Speech and Voice Changer RESPONSES. Both synthesize audio and consume
 * characters, so a health probe would spend the customer's quota to measure it. The
 * `synthesize-speech` action returns the figure to any workflow that wants it.
 *
 * `severity: "informational"`: otherwise the permanent `unknown` pins the app.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Character quota",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason:
      "Murf exposes no balance endpoint: remainingCharacterCount only comes back on a synthesis " +
      "call, which consumes characters, so no non-billable probe exists.",
  },
};

export default quota;
