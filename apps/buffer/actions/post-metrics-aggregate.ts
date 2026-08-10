import type { ActionDefinition } from "@w6w/types";
import { BufferClient, compact, idList } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `query aggregatedPostMetrics(input: AggregatedPostMetricsInput!)` —
 * performance totals over a date window.
 *
 * ## What comes back, and the trap inside it
 *
 * A flat list of `PostMetric` rows plus a `metricsUpdatedAt`. Buffer describes
 * the contents precisely, and two sentences carry the whole caveat:
 *
 *   > Always includes a baseline trio (`postCount`, `reactions`, `comments`) —
 *   > posts on networks that don't track reactions or comments contribute 0 to
 *   > those totals. Beyond the baseline, **additional metric types are included
 *   > only when every channel in the filter set supports them.**
 *
 * So the shape of the response depends on which channels were in scope. Ask
 * across an Instagram and a Mastodon channel and you get the baseline trio; ask
 * across two Instagram channels and you get impressions and saves as well. That
 * is not a bug to code around, but it does mean a workflow must not assume a
 * metric row exists — which is why the output declares `metrics` as an array of
 * rows rather than promising named fields that may not be there.
 *
 * The post count is not a separate field: it *is* a metric row, with
 * `type: postCount`.
 *
 * ## The window is required, capped, and midnight-shaped
 *
 * `startDateTime` and `endDateTime` are both non-null, and Buffer caps the
 * range: *"Date range is capped to 365 days."* Its guidance on the bounds is
 * unusually specific — *"Consumers typically pass UTC midnight of the last
 * calendar day in the window (the backend treats the range as inclusive of that
 * day)"* — so `2026-01-01T00:00:00Z` → `2026-01-31T00:00:00Z` covers all of
 * January, not thirty days of it. Both hints say so, because an off-by-one day
 * here is invisible in the output.
 *
 * ## Empty array vs. omitted, on `channelIds`
 *
 * These are opposite instructions, in Buffer's own words: *"When omitted
 * (null), the aggregate spans every channel in the organization the actor has
 * insights access to. When set to an empty array, no channels match and the
 * result is empty."* `idList()` returns `undefined` for a blank or
 * whitespace-only field precisely so a user who typed nothing gets "every
 * channel" rather than "no channels" — `lib/client.ts` documents that choice.
 *
 * ## Freshness
 *
 * `metricsUpdatedAt` is *"the latest `metricsUpdatedAt` across the matched
 * posts"*, and *"Metrics are refreshed daily, so values can be up to ~24h
 * behind the source network. Null when no posts matched the filter."* Reported
 * as a first-class output because a total with no timestamp beside it invites
 * being read as live.
 *
 * The same personal-key caveat that applies to `Post.metrics` is worth carrying
 * here — Buffer documents metric reading as a personal-API-key workflow — so
 * this is one of the actions least likely to behave identically on the two auth
 * methods.
 */
const AGGREGATED_METRICS = `query W6wAggregatedPostMetrics($input: AggregatedPostMetricsInput!) {
  aggregatedPostMetrics(input: $input) {
    metricsUpdatedAt
    metrics { type name description value unit }
  }
}`;

interface Input {
  organizationId: string;
  startDateTime: string;
  endDateTime: string;
  channelIds?: string;
}

const postMetricsAggregate: ActionDefinition<Input> = {
  key: "post-metrics-aggregate",
  type: "read",
  resource: "metrics",
  title: "Aggregate Post Metrics",
  description:
    "Normalised performance totals across a date window — always postCount, reactions and " +
    "comments, plus any metric every channel in scope supports.",
  params: [
    organizationIdParam,
    {
      key: "startDateTime",
      label: "From",
      type: "datetime",
      required: true,
      hint: "UTC midnight of the first calendar day, e.g. `2026-01-01T00:00:00Z`. Max window " +
        "365 days.",
    },
    {
      key: "endDateTime",
      label: "To",
      type: "datetime",
      required: true,
      hint: "UTC midnight of the **last** calendar day — the range is inclusive of that day, so " +
        "`2026-01-31T00:00:00Z` covers all of 31 January.",
    },
    {
      key: "channelIds",
      label: "Channel IDs",
      type: "string",
      hint: "Comma-separated. Leave blank for every channel you have insights access to — an " +
        "explicitly empty set matches nothing.",
    },
  ],
  output: [
    {
      key: "aggregatedPostMetrics.metricsUpdatedAt",
      type: "string",
      label: "Metrics refreshed at",
    },
    { key: "aggregatedPostMetrics.metrics", type: "array", label: "Metric rows" },
    { key: "aggregatedPostMetrics.metrics[].type", type: "string", label: "Metric type" },
    { key: "aggregatedPostMetrics.metrics[].name", type: "string", label: "Metric name" },
    { key: "aggregatedPostMetrics.metrics[].value", type: "number", label: "Value" },
    { key: "aggregatedPostMetrics.metrics[].unit", type: "string", label: "Unit" },
  ],

  execute(input, ctx) {
    return new BufferClient(ctx).request(AGGREGATED_METRICS, {
      input: compact({
        organizationId: input.organizationId,
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
        channelIds: idList(input.channelIds),
      }),
    });
  },
};

export default postMetricsAggregate;
