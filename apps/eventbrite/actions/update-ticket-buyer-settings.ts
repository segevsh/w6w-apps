import type { ActionDefinition } from "@w6w/types";
import { TICKET_BUYER_SETTINGS_OUTPUT, TICKET_BUYER_SETTINGS_SAMPLE } from "../lib/outputs.ts";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  eventId: string;
  confirmationMessage?: string;
  instructions?: string;
  salesEndedMessage?: string;
  surveyInfo?: string;
  refundRequestEnabled?: boolean;
  redirectUrl?: string;
  allowAttendeeUpdate?: boolean;
  surveyName?: string;
  surveyTimeLimit?: number;
  surveyRespondent?: "ticket_buyer" | "attendee";
  surveyTicketClasses?: unknown[];
  extra?: Record<string, unknown>;
}

const action: ActionDefinition<Input> = {
  key: "update-ticket-buyer-settings",
  type: "perform",
  idempotent: true,
  resource: "event",
  title: "Update Ticket Buyer Settings",
  description:
    "Update the ticket buyer settings of an event on Eventbrite (post-purchase messages, registration survey, refund requests).",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "confirmationMessage", label: "Confirmation message (HTML)", type: "string" },
    { key: "instructions", label: "Instructions (HTML)", type: "string" },
    { key: "salesEndedMessage", label: "Sales ended message (HTML)", type: "string" },
    { key: "surveyInfo", label: "Survey info (HTML)", type: "string" },
    { key: "refundRequestEnabled", label: "Refund requests enabled", type: "boolean" },
    {
      key: "redirectUrl",
      label: "Redirect URL",
      type: "string",
      hint: "Post-purchase redirect; overrides the confirmation message.",
    },
    { key: "allowAttendeeUpdate", label: "Allow attendee update", type: "boolean" },
    { key: "surveyName", label: "Survey name", type: "string" },
    { key: "surveyTimeLimit", label: "Survey time limit (minutes)", type: "number" },
    {
      key: "surveyRespondent",
      label: "Survey respondent",
      type: "select",
      options: [{ value: "ticket_buyer", label: "ticket_buyer" }, {
        value: "attendee",
        label: "attendee",
      }],
    },
    {
      key: "surveyTicketClasses",
      label: "Survey ticket classes",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      hint:
        "Merged (deep) into the request object for any field not listed above, using Eventbrite's snake_case names.",
    },
  ],
  output: TICKET_BUYER_SETTINGS_OUTPUT,
  sample: TICKET_BUYER_SETTINGS_SAMPLE,

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    const obj: Record<string, unknown> = {};
    if (input.confirmationMessage !== undefined) {
      obj.confirmation_message = { html: input.confirmationMessage };
    }
    if (input.instructions !== undefined) obj.instructions = { html: input.instructions };
    if (input.salesEndedMessage !== undefined) {
      obj.sales_ended_message = { html: input.salesEndedMessage };
    }
    if (input.surveyInfo !== undefined) obj.survey_info = { html: input.surveyInfo };
    if (input.refundRequestEnabled !== undefined) {
      obj.refund_request_enabled = input.refundRequestEnabled;
    }
    if (input.redirectUrl !== undefined) obj.redirect_url = input.redirectUrl;
    if (input.allowAttendeeUpdate !== undefined) {
      obj.allow_attendee_update = input.allowAttendeeUpdate;
    }
    if (input.surveyName !== undefined) obj.survey_name = input.surveyName;
    if (input.surveyTimeLimit !== undefined) obj.survey_time_limit = input.surveyTimeLimit;
    if (input.surveyRespondent !== undefined) obj.survey_respondent = input.surveyRespondent;
    if (input.surveyTicketClasses !== undefined) {
      obj.survey_ticket_classes = input.surveyTicketClasses;
    }
    if (input.extra) deepMerge(obj, input.extra);
    return await client.request(`/events/${enc(input.eventId)}/ticket_buyer_settings/`, {
      method: "POST",
      body: { ticket_buyer_settings: obj },
    });
  },
};

export default action;
