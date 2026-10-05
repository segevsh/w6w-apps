import type { ActionDefinition } from "@w6w/types";
import { compact, MightyClient, seg } from "../lib/client.ts";

/** `POST /events/{event_id}/rsvps` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  eventId: number;
  memberId: number;
  status: string;
  instanceAt?: string;
}

const rsvpCreate: ActionDefinition<Input> = {
  key: "rsvp-create",
  type: "perform",
  resource: "rsvp",
  title: "Set RSVP",
  description: "Create or update a member's RSVP to an event.",
  idempotent: true,
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "memberId",
      label: "Member ID",
      type: "number",
      required: true,
      hint: "The member to RSVP on behalf of.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [{ value: "yes", label: "Yes" }, { value: "maybe", label: "Maybe" }, {
        value: "no",
        label: "No",
      }],
    },
    {
      key: "instanceAt",
      label: "Instance",
      type: "datetime",
      hint: "The specific instance of a recurring event (ISO 8601).",
    },
  ],
  output: [
    { key: "status", type: "string", label: "yes, maybe or no" },
    { key: "updated", type: "string", label: "Last updated (ISO 8601)" },
    { key: "event", type: "object", label: "The event" },
    { key: "member", type: "object", label: "The member" },
    { key: "event_instance", type: "object", label: "The recurring-event instance, if any" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request(`/events/${seg(input.eventId)}/rsvps`, {
      method: "POST",
      body: compact({
        member_id: input.memberId,
        status: input.status,
        instance_at: input.instanceAt,
      }),
    });
  },
};

export default rsvpCreate;
