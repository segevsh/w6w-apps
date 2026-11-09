import { webhookTrigger } from "../lib/triggers.ts";

const trigger = webhookTrigger({
  key: "profile-state-changed",
  title: "Profile State Changed",
  description:
    "Fires when a profile moves to a new state. The run gets the event: the profile id and its current and previous state.",
  eventType: "profiles#state-change",
  sampleData: {
    resource: { type: "profile", id: 222 },
    current_state: "VERIFIED",
    previous_state: "PENDING_VERIFICATION",
    occurred_at: "2026-11-09T10:12:50Z",
  },
});

export default trigger;
