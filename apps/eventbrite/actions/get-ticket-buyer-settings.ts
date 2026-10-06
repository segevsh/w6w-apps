import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-ticket-buyer-settings",
  type: "read",
  resource: "event",
  title: "Get Ticket Buyer Settings",
  description:
    "Retrieve the ticket buyer settings (confirmation message, instructions, registration survey, refund requests) for an event.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
  ],
  output: [
    { key: "confirmation_message", type: "object", label: "Confirmation message" },
    { key: "instructions", type: "object", label: "Instructions" },
    { key: "sales_ended_message", type: "object", label: "Sales ended message" },
    { key: "survey_info", type: "object", label: "Survey info" },
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "survey_name", type: "string", label: "Survey name" },
    { key: "refund_request_enabled", type: "boolean", label: "Refund requests enabled" },
    { key: "allow_attendee_update", type: "boolean", label: "Attendee update allowed" },
    { key: "survey_time_limit", type: "number", label: "Survey time limit (minutes)" },
    { key: "redirect_url", type: "string", label: "Redirect URL" },
    { key: "survey_respondent", type: "string", label: "Survey respondent" },
    { key: "survey_ticket_classes", type: "array", label: "Survey ticket classes" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    return await client.request(`/events/${enc(input.eventId)}/ticket_buyer_settings/`, {
      method: "GET",
    });
  },
};

export default action;
