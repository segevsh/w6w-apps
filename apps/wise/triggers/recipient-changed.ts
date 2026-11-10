import { webhookTrigger, type WebhookTriggerSpec } from "../lib/triggers.ts";

/** Exported so the tests can rebuild the trigger with their own key pair. */
export const spec: WebhookTriggerSpec = {
  key: "recipient-changed",
  title: "Recipient Changed",
  description:
    "Fires when a recipient account created or changed through hosted recipient creation changes state (created, updated, deactivated, obfuscated or deleted). The run gets the event: the recipient id, its currency and the new state.",
  eventType: "recipients#state-change",
  // Wise 4.0.0 payload (docs.wise.com/api-reference/webhook-event/eventrecipientsstatechange,
  // verified 2026-11-10): data.resource = { id, occurred_at, data: { recipientId, profileId,
  // currency, state: CREATE | UPDATE | DEACTIVATE | OBFUSCATE | DELETE, clientId } }.
  profilePath: ["resource", "data", "profileId"],
  sampleData: {
    resource: {
      id: "700525176",
      occurred_at: "2026-11-10T10:12:50Z",
      data: {
        recipientId: 700525176,
        profileId: 222,
        currency: "EUR",
        state: "CREATE",
        clientId: "sample-client",
      },
    },
  },
};

const trigger = webhookTrigger(spec);

export default trigger;
