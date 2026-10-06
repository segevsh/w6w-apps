import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/events/troubleshootSlots` — Explain why slots are or are not offered on a date.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  linkPrefix: string;
  date: string;
  timezone: string;
  selectedHost?: number;
}

const eventSlotsTroubleshoot: ActionDefinition<Input> = {
  key: "event-slots-troubleshoot",
  type: "read",
  resource: "event",
  title: "Troubleshoot slots",
  description: "Explain why slots are or are not offered on a date.",
  params: [
    {
      key: "linkPrefix",
      label: "Link prefix",
      type: "string",
      required: true,
      hint: "username/event-name",
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
    },
    {
      key: "timezone",
      label: "Time zone",
      type: "string",
      required: true,
      hint: "IANA time zone.",
    },
    {
      key: "selectedHost",
      label: "Host user ID",
      type: "number",
      validation: { integer: true },
    },
  ],
  output: [
    { key: "data", type: "object", label: "{slots[]}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/events/troubleshootSlots", {
      query: {
        linkPrefix: input.linkPrefix,
        date: input.date,
        timezone: input.timezone,
        selectedHost: input.selectedHost,
      },
    });
  },
};

export default eventSlotsTroubleshoot;
