import type { ActionDefinition } from "@w6w/types";
import { SemrushClient } from "../lib/client.ts";

/**
 * `GET /apis/v4/keywords/v1/metrics` — one keyword's volume, difficulty and SERP features.
 *
 * The keyword-side counterpart to the backlink reports: where the backlink
 * endpoints describe a target's link profile, this describes a single query in a
 * single market.
 *
 * `data` is an object: `competitive_density` (integer), `cpc` (a **string**, USD
 * in cents — the vendor returns it as text, so it is passed through unchanged
 * rather than coercing it into a float), `intents` (string[]),
 * `keyword_difficulty` (integer), `number_of_results` (string),
 * `search_volume` (string), `serp_features` (string[]) and `trends` (an array of
 * 12 monthly integers).
 *
 * `country` is the ISO 3166-1 alpha-2 code of the database to query (`us`, `uk`,
 * `de`). It is typed as a plain two-letter string rather than a closed select:
 * SEMrush publishes around 140 databases and adds them over time, so a
 * hand-copied list here would be both long and silently out of date.
 */
interface Input {
  keyword: string;
  country: string;
  month?: string;
}

const keywordMetricsGet: ActionDefinition<Input> = {
  key: "keyword-metrics-get",
  type: "read",
  resource: "keyword",
  title: "Get Keyword Metrics",
  description: "Read a keyword's search volume, difficulty, CPC, intent and SERP features.",
  params: [
    {
      key: "keyword",
      label: "Keyword",
      type: "string",
      required: true,
      placeholder: "running shoes",
      validation: { minLength: 1, maxLength: 255 },
      hint: "The query to measure. 1-255 characters, exactly as a user would type it.",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: true,
      placeholder: "us",
      validation: { pattern: "^[A-Za-z]{2}$" },
      hint: "ISO 3166-1 alpha-2 code of the SEMrush database to query — `us`, `uk`, `de`. " +
        "Which databases exist depends on the plan.",
    },
    {
      key: "month",
      label: "Month",
      type: "string",
      placeholder: "2026-09",
      validation: { pattern: "^\\d{4}-\\d{2}$" },
      hint: "The `YYYY-MM` snapshot to report. The earliest accepted month is `2012-01`.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The keyword's metrics" }],

  async execute(input, ctx) {
    const data = await new SemrushClient(ctx)
      .data<Record<string, unknown>>("/keywords/v1/metrics", {
        query: { keyword: input.keyword, country: input.country, month: input.month },
      });
    return { data };
  },
};

export default keywordMetricsGet;
