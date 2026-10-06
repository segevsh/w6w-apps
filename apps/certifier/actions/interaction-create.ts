import type { ActionDefinition } from "@w6w/types";
import { CertifierClient } from "../lib/client.ts";
import { credentialIdParam, interactionEventOptions } from "../lib/params.ts";

interface Input {
  credentialId: string;
  eventType: string;
  triggeredBy: string;
  triggeredAt?: string;
}

const interactionCreate: ActionDefinition<Input> = {
  key: "interaction-create",
  type: "perform",
  resource: "credential-interaction",
  title: "Record Credential Interaction",
  description:
    "Record an interaction event (view, share, download, verification) against a credential, " +
    "for when the credential is shown somewhere other than Certifier's own wallet.",
  // No idempotency key: a retry records a second event.
  idempotent: false,
  params: [
    credentialIdParam,
    {
      key: "eventType",
      label: "Event",
      type: "select",
      required: true,
      options: interactionEventOptions,
    },
    {
      key: "triggeredBy",
      label: "Triggered by",
      type: "select",
      required: true,
      options: [
        { value: "recipient", label: "Recipient" },
        { value: "guest", label: "Guest" },
      ],
    },
    {
      key: "triggeredAt",
      label: "Happened at",
      type: "datetime",
      hint: "ISO 8601. Defaults to now.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Interaction ID" },
    { key: "credentialId", type: "string", label: "Credential ID" },
    { key: "eventType", type: "string", label: "Event" },
    { key: "triggeredBy", type: "string", label: "Triggered by" },
    { key: "triggeredAt", type: "string", label: "Happened at" },
  ],

  execute(input, ctx) {
    if (!input.credentialId?.trim()) throw new Error("credentialId is required");
    if (!interactionEventOptions.some((o) => o.value === input.eventType)) {
      throw new Error(`eventType is not one of Certifier's documented events: ${input.eventType}`);
    }
    if (input.triggeredBy !== "recipient" && input.triggeredBy !== "guest") {
      throw new Error("triggeredBy must be recipient or guest");
    }
    return new CertifierClient(ctx).json("/credential-interactions", {
      method: "POST",
      body: {
        credentialId: input.credentialId.trim(),
        eventType: input.eventType,
        triggeredBy: input.triggeredBy,
        // The field is required by the API; the "now" default is applied here.
        triggeredAt: input.triggeredAt || new Date().toISOString(),
      },
    });
  },
};

export default interactionCreate;
