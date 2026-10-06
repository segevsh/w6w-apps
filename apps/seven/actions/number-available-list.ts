import type { ActionDefinition } from "@w6w/types";
import { SevenClient } from "../lib/client.ts";

/** `GET /api/numbers/available` — numbers that can be booked (booking itself is not covered). */
interface Input {
  country?: string;
  features_sms?: boolean;
  features_a2p_sms?: boolean;
  features_voice?: boolean;
}

const numberAvailableList: ActionDefinition<Input> = {
  key: "number-available-list",
  type: "search",
  resource: "number",
  title: "List Available Numbers",
  description: "Search phone numbers that can be booked, with their fees and features.",
  params: [
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "ISO 3166-1 alpha-2 code, e.g. DK.",
      validation: { pattern: "^[A-Za-z]{2}$" },
    },
    { key: "features_sms", label: "Supports SMS", type: "boolean" },
    { key: "features_a2p_sms", label: "Supports A2P SMS", type: "boolean" },
    { key: "features_voice", label: "Supports voice", type: "boolean" },
  ],
  output: [{ key: "availableNumbers", type: "array", label: "Numbers with fees and features" }],

  execute(input, ctx) {
    return new SevenClient(ctx).request("GET", "/numbers/available", {
      query: {
        country: input.country?.toUpperCase(),
        features_sms: input.features_sms,
        features_a2p_sms: input.features_a2p_sms,
        features_voice: input.features_voice,
      },
    });
  },
};

export default numberAvailableList;
