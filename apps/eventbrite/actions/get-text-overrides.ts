import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  textCodes: string[];
  locale?: string;
  eventId?: string;
  venueId?: string;
}

export const TEXT_CODES = [
  "tickets_not_yet_on_sale",
  "tickets_with_sales_ended",
  "tickets_sold_out",
  "tickets_unavailable",
  "tickets_at_the_door",
  "event_cancelled",
  "event_postponed",
  "checkout_title_tickets",
  "checkout_title_add_ons",
  "checkout_title_donations",
];

const getTextOverrides: ActionDefinition<Input> = {
  key: "get-text-overrides",
  type: "read",
  resource: "text_override",
  title: "Get Text Overrides",
  description:
    "Retrieve the text overrides for an organization in a locale, optionally filtered to an event or venue.",
  idempotent: true,
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    {
      key: "textCodes",
      label: "Text codes",
      type: "multiselect",
      required: true,
      options: TEXT_CODES.map((c) => ({ value: c, label: c })),
    },
    { key: "locale", label: "Locale", type: "string", placeholder: "en_US" },
    { key: "eventId", label: "Event ID", type: "string" },
    { key: "venueId", label: "Venue ID", type: "string" },
  ],
  output: [
    { key: "text_code", type: "string", label: "Text code" },
    { key: "message", type: "string", label: "Message" },
    { key: "message_code", type: "string", label: "Message code" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/organizations/${encodeURIComponent(input.organizationId)}/text_overrides/`,
      {
        query: {
          text_codes: input.textCodes.join(","),
          locale: input.locale,
          event_id: input.eventId,
          venue_id: input.venueId,
        },
      },
    );
  },
};

export default getTextOverrides;
