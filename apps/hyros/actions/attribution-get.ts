import type { ActionDefinition } from "@w6w/types";
import { csv, HyrosClient } from "../lib/client.ts";

interface Input {
  attributionModel: string;
  startDate: string;
  endDate: string;
  level: string;
  fields: string;
  ids?: string;
  currency?: string;
  dayOfAttribution?: boolean;
  scientificDaysRange?: number;
  isAdAccountId?: boolean;
}

export const MODELS = ["last_click", "scientific", "first_click"];
export const LEVELS = [
  "google_campaign",
  "google_v2_adgroup",
  "google_ad",
  "google_v2_keyword",
  "facebook_adset",
  "facebook_campaign",
  "facebook_ad",
  "tiktok_adgroup",
  "tiktok_ad",
  "snapchat_adsquad",
  "snapchat_ad",
  "pinterest_adgroup",
  "pinterest_ad",
  "twitter_adgroup",
  "bing_adgroup",
  "bing_ad",
  "linkedin_campaign",
];

const attributionGet: ActionDefinition<Input> = {
  key: "attribution-get",
  type: "read",
  resource: "attribution",
  title: "Get Ad Attribution Report",
  description:
    "Revenue, sales, calls, cost and ROI attributed to ads, ad sets or campaigns at one level.",
  params: [
    {
      key: "attributionModel",
      label: "Attribution model",
      type: "select",
      required: true,
      default: "last_click",
      options: MODELS.map((v) => ({ value: v, label: v })),
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      required: true,
      hint: "ISO 8601, e.g. 2026-09-01T00:00:00.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "string",
      required: true,
      hint: "ISO 8601, e.g. 2026-09-30T23:59:59.",
    },
    {
      key: "level",
      label: "Level",
      type: "select",
      required: true,
      options: LEVELS.map((v) => ({ value: v, label: v })),
      hint: "google_v2_* levels need the Google v2 integration.",
    },
    {
      key: "fields",
      label: "Metrics",
      type: "string",
      required: true,
      default: "sales,revenue,calls,cost",
      hint:
        "Comma-separated metric names, e.g. sales,revenue,calls,cost,roas,leads,clicks. See the README for the full list.",
    },
    {
      key: "ids",
      label: "IDs",
      type: "string",
      hint:
        "Comma-separated platform ids matching the level (ad ids for facebook_ad, ...). Required except for google_v2_keyword.",
    },
    {
      key: "isAdAccountId",
      label: "IDs are an ad account id",
      type: "boolean",
      hint: "When true, give exactly one ad account id in IDs; all its sources are paginated in.",
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
    {
      key: "dayOfAttribution",
      label: "Filter by click date",
      type: "boolean",
      hint: "When true the date range filters the clicks that led to sales, not the sales.",
    },
    {
      key: "scientificDaysRange",
      label: "Scientific days range",
      type: "number",
      validation: { min: 1, max: 30, integer: true },
    },
  ],
  output: [{ key: "result", type: "array", label: "One row per id with the requested metrics" }],

  async execute(input, ctx) {
    const { result } = await new HyrosClient(ctx).read("/attribution", {
      attributionModel: input.attributionModel,
      startDate: input.startDate,
      endDate: input.endDate,
      level: input.level,
      fields: csv(input.fields).join(","),
      ids: csv(input.ids).join(",") || undefined,
      isAdAccountId: input.isAdAccountId,
      currency: input.currency,
      dayOfAttribution: input.dayOfAttribution,
      scientificDaysRange: input.scientificDaysRange,
    });
    return { result };
  },
};

export default attributionGet;
