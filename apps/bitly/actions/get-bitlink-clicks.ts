import type { ActionDefinition } from "@w6w/types";
import { BitlyClient } from "../lib/client.ts";

type Unit = "minute" | "hour" | "day" | "week" | "month";

interface Input {
  bitlink: string;
  unit?: Unit;
  units?: number;
  unitReference?: string;
}

interface LinkClick {
  date: string;
  clicks: number;
}

interface ClicksResult {
  link_clicks: LinkClick[];
  unit: string;
  units: number;
  unit_reference?: string;
}

/**
 * GET /bitlinks/{bitlink}/clicks
 *
 * Click counts bucketed by `unit`, e.g. one count per day. `units: -1` (the
 * Bitly default) means "as many buckets back as available" for the chosen
 * unit.
 */
const getBitlinkClicks: ActionDefinition<Input, ClicksResult> = {
  key: "get-bitlink-clicks",
  type: "read",
  resource: "bitlink",
  title: "Get Bitlink Clicks",
  description: "Click counts for a Bitlink, bucketed by time unit.",
  params: [
    {
      key: "bitlink",
      label: "Bitlink",
      type: "string",
      required: true,
      placeholder: "bit.ly/abc123",
      hint: "domain/hash, without the https:// scheme.",
    },
    {
      key: "unit",
      label: "Time unit",
      type: "select",
      default: "day",
      options: [
        { value: "minute", label: "Minute" },
        { value: "hour", label: "Hour" },
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
      ],
    },
    {
      key: "units",
      label: "Number of units",
      type: "number",
      default: -1,
      hint: "-1 for as far back as Bitly has data for the chosen unit.",
    },
    {
      key: "unitReference",
      label: "Unit reference (ISO 8601)",
      type: "datetime",
      hint: "Most recent time to pull metrics from. Defaults to now.",
    },
  ],
  output: [
    { key: "link_clicks", type: "array", label: "Clicks per bucket" },
  ],

  execute(input, ctx) {
    const client = new BitlyClient(ctx);
    return client.request<ClicksResult>(`/bitlinks/${input.bitlink}/clicks`, {
      query: {
        unit: input.unit ?? "day",
        units: input.units ?? -1,
        unit_reference: input.unitReference,
      },
    });
  },
};

export default getBitlinkClicks;
