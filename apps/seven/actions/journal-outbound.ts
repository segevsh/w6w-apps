import type { ActionDefinition } from "@w6w/types";
import { asObject, SevenClient } from "../lib/client.ts";

/** `GET /api/journal/outbound` — Read the outbound logbook: sent SMS and RCS with price, delivery report (dlr) and timestamps. This is the way to read delivery status. At most 100 entries per call; page with limit and offset. */
interface Input {
  id?: number;
  date_from?: string;
  date_to?: string;
  state?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

const journalOutbound: ActionDefinition<Input> = {
  key: "journal-outbound",
  type: "search",
  resource: "journal",
  title: "List Sent Messages",
  description:
    "Read the outbound logbook: sent SMS and RCS with price, delivery report (dlr) and timestamps. This is the way to read delivery status. Up to 100 entries per call.",
  params: [
    { key: "id", label: "Message ID", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "date_from",
      label: "From date",
      type: "string",
      hint: "YYYY-MM-DD",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    {
      key: "date_to",
      label: "To date",
      type: "string",
      hint: "YYYY-MM-DD",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    {
      key: "state",
      label: "State",
      type: "string",
      hint: "DELIVERED, NOTDELIVERED, ... for SMS.",
    },
    { key: "to", label: "Recipient", type: "string", hint: "Phone number in any format." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "1 to 100.",
      validation: { integer: true, min: 1, max: 100 },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "Entries to skip.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [{ key: "entries", type: "array", label: "Logbook entries" }],

  async execute(input, ctx) {
    const body = await new SevenClient(ctx).request("GET", "/journal/outbound", {
      query: {
        id: input.id,
        date_from: input.date_from,
        date_to: input.date_to,
        state: input.state,
        to: input.to,
        limit: input.limit,
        offset: input.offset,
      },
    });
    return asObject(body, "entries");
  },
};

export default journalOutbound;
