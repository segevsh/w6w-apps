import type { ActionDefinition } from "@w6w/types";
import { BitlyClient } from "../lib/client.ts";

type Unit = "minute" | "hour" | "day" | "week" | "month";

interface Input {
  bitlink: string;
  unit?: Unit;
  units?: number;
  unitReference?: string;
}

interface ClicksSummaryResult {
  total_clicks: number;
  unit: string;
  units: number;
  unit_reference?: string;
}

/**
 * GET /bitlinks/{bitlink}/clicks/summary
 *
 * Same time-window params as Get Bitlink Clicks, collapsed to one total
 * instead of a bucket-per-unit series.
 */
const getBitlinkClicksSummary: ActionDefinition<Input, ClicksSummaryResult> = {
  key: "get-bitlink-clicks-summary",
  type: "read",
  resource: "bitlink",
  title: "Get Bitlink Clicks Summary",
  description: "Total click count for a Bitlink over a time window.",
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
    { key: "total_clicks", type: "number", label: "Total clicks" },
  ],

  execute(input, ctx) {
    const client = new BitlyClient(ctx);
    return client.request<ClicksSummaryResult>(`/bitlinks/${input.bitlink}/clicks/summary`, {
      query: {
        unit: input.unit ?? "day",
        units: input.units ?? -1,
        unit_reference: input.unitReference,
      },
    });
  },
};

export default getBitlinkClicksSummary;
