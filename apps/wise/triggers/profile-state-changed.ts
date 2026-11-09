import { webhookTrigger, type WebhookTriggerSpec } from "../lib/triggers.ts";

/** Exported so the tests can rebuild the trigger with their own key pair. */
export const spec: WebhookTriggerSpec = {
  key: "profile-state-changed",
  title: "Profile State Changed",
  description:
    "Fires when a profile moves to a new state. The run gets the event: the profile id and its current state.",
  eventType: "profiles#state-change",
  // Wise 4.0.0 payload: data.resource = { type: "profile", id } where id IS the profile id.
  profilePath: ["resource", "id"],
  resourceType: "profile",
  sampleData: {
    resource: { type: "profile", id: 222 },
    current_state: "VERIFIED",
    occurred_at: "2026-11-09T10:12:50Z",
    requested_by_customer: false,
  },
};

const trigger = webhookTrigger(spec);

export default trigger;
