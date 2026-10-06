import type { ActionDefinition } from "@w6w/types";
import { csv, HyrosClient } from "../lib/client.ts";
import { MODELS } from "./attribution-get.ts";

interface Input {
  attributionModel: string;
  startDate: string;
  endDate: string;
  fields: string;
  ids: string;
  currency?: string;
  dayOfAttribution?: boolean;
  scientificDaysRange?: number;
}

const attributionAdAccountGet: ActionDefinition<Input> = {
  key: "attribution-ad-account-get",
  type: "read",
  resource: "attribution",
  title: "Get Ad Account Attribution Report",
  description: "Attribution totals rolled up per ad account.",
  params: [
    {
      key: "attributionModel",
      label: "Attribution model",
      type: "select",
      required: true,
      default: "last_click",
      options: MODELS.map((v) => ({ value: v, label: v })),
    },
    { key: "startDate", label: "Start date", type: "string", required: true, hint: "ISO 8601." },
    { key: "endDate", label: "End date", type: "string", required: true, hint: "ISO 8601." },
    {
      key: "fields",
      label: "Metrics",
      type: "string",
      required: true,
      default: "sales,revenue,calls,cost",
      hint: "Comma-separated metric names.",
    },
    {
      key: "ids",
      label: "Ad account IDs",
      type: "string",
      required: true,
      hint: "Comma-separated ad account ids.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: [{ value: "user_currency", label: "Account currency" }, {
        value: "usd",
        label: "USD",
      }],
    },
    { key: "dayOfAttribution", label: "Filter by click date", type: "boolean" },
    {
      key: "scientificDaysRange",
      label: "Scientific days range",
      type: "number",
      validation: { min: 1, max: 30, integer: true },
    },
  ],
  output: [{ key: "result", type: "array", label: "One row per ad account" }],

  async execute(input, ctx) {
    const { result } = await new HyrosClient(ctx).read("/attribution/ad-account", {
      attributionModel: input.attributionModel,
      startDate: input.startDate,
      endDate: input.endDate,
      fields: csv(input.fields).join(","),
      ids: csv(input.ids).join(","),
      currency: input.currency,
      dayOfAttribution: input.dayOfAttribution,
      scientificDaysRange: input.scientificDaysRange,
    });
    return { result };
  },
};

export default attributionAdAccountGet;
