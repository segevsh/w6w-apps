import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  cancelReason?: string;
}

const eventCancel: ActionDefinition<Input> = {
  key: "event-cancel",
  type: "perform",
  resource: "event",
  title: "Cancel Event",
  description: "Cancel an event, optionally recording a reason.",
  idempotent: false,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "cancelReason", label: "Cancel reason", type: "text" },
  ],
  output: [{ key: "state", type: "string", label: "Event state (canceled)" }],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json(`/events/${encodeId(input.eventId)}/cancel`, {
      method: "POST",
      body: compact({ cancel_reason: input.cancelReason }),
    });
  },
};

export default eventCancel;
