import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient, uuidOf } from "../lib/client.ts";

interface Input {
  event: string;
  status?: "active" | "canceled";
  email?: string;
  count?: number;
  pageToken?: string;
}

/**
 * GET /scheduled_events/{uuid}/invitees — the people booked onto a meeting. The
 * event is addressed by its URI or UUID; the rest are optional filters.
 */
const inviteeGetMany: ActionDefinition<Input> = {
  key: "invitee-get-many",
  type: "read",
  resource: "invitee",
  title: "List Event Invitees",
  description: "List invitees for a scheduled event (GET /scheduled_events/{uuid}/invitees).",
  params: [
    {
      key: "event",
      label: "Event URI or UUID",
      type: "string",
      required: true,
      hint: "e.g. https://api.calendly.com/scheduled_events/DDDD or just DDDD.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "canceled", label: "Canceled" },
      ],
    },
    { key: "email", label: "Email", type: "string", hint: "Filter to a single invitee email." },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Rows per page (1–100, default 20).",
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "pageToken", label: "Page token", type: "string", advanced: true },
  ],
  output: [
    { key: "collection", type: "array", label: "Invitees" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new CalendlyClient(ctx).request(
      `/scheduled_events/${encodeURIComponent(uuidOf(input.event))}/invitees`,
      {
        query: {
          status: input.status,
          email: input.email,
          count: input.count,
          page_token: input.pageToken,
        },
      },
    );
  },
};

export default inviteeGetMany;
