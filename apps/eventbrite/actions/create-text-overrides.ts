import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Override {
  textCode: string;
  message?: string;
  messageCode?: string;
}

interface Input {
  organizationId: string;
  strings: Override[];
  locale?: string;
  eventId?: string;
  venueId?: string;
  extra?: Record<string, unknown>;
}

const CODES = [
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
const codeOptions = CODES.map((c) => ({ value: c, label: c }));

const createTextOverrides: ActionDefinition<Input> = {
  key: "create-text-overrides",
  type: "perform",
  idempotent: false,
  resource: "text_override",
  title: "Create Text Overrides",
  description:
    "Set custom ticket-page text for an organization, venue or event. Each entry replaces a text code with a custom message or another default message code. If no locale is given, the event's locale is used when an event ID is set, otherwise the default locale. Changes the text shown to buyers on Eventbrite.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    {
      key: "strings",
      label: "Overrides",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          {
            key: "textCode",
            label: "Text code",
            type: "select",
            required: true,
            options: codeOptions,
          },
          { key: "message", label: "Message", type: "string" },
          { key: "messageCode", label: "Message code", type: "select", options: codeOptions },
        ],
      },
    },
    { key: "locale", label: "Locale", type: "string", placeholder: "en_US" },
    { key: "eventId", label: "Event ID", type: "string" },
    { key: "venueId", label: "Venue ID", type: "string" },
    { key: "extra", label: "Additional fields", type: "json" },
  ],
  output: [
    { key: "text_code", type: "string", label: "Text code" },
    { key: "message", type: "string", label: "Message" },
    { key: "message_code", type: "string", label: "Message code" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const body: Record<string, unknown> = {
      strings: input.strings.map((s) => {
        const o: Record<string, unknown> = { text_code: s.textCode };
        if (s.message !== undefined) o.message = s.message;
        if (s.messageCode) o.message_code = s.messageCode;
        return o;
      }),
    };
    if (input.locale) body.locale = input.locale;
    if (input.eventId) body.event_id = input.eventId;
    if (input.venueId) body.venue_id = input.venueId;
    Object.assign(body, input.extra ?? {});
    return client.request(
      `/organizations/${encodeURIComponent(input.organizationId)}/text_overrides/`,
      { method: "POST", body },
    );
  },
};

export default createTextOverrides;
