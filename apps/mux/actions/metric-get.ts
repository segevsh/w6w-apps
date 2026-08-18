import type { ActionDefinition } from "@w6w/types";
import { csv, MuxClient } from "../lib/client.ts";

/**
 * `GET /data/v1/metrics/{metric}/overall` — how the video actually performed
 * for viewers.
 *
 * This is Mux Data rather than Mux Video, and it answers a different kind of
 * question: not "does the file exist" but "did people manage to watch it".
 * The metrics that matter are the ones a viewer would describe as the video
 * being bad —
 *
 *   - `video_startup_time` — how long before playback began;
 *   - `rebuffer_percentage` — how much of the session was spent buffering;
 *   - `playback_failure_percentage` — how often it did not play at all;
 *   - `exits_before_video_start` — how many gave up waiting.
 *
 * ## Filters are the point
 *
 * An overall number is nearly useless; the same figure split by
 * `browser`, `country`, `asset_id` or `video_title` is what identifies the
 * problem. Filters are `field:value` pairs, and Mux Data's whole design is that
 * you compare a slice against the overall value it comes with.
 *
 * This needs a token created with the **Mux Data** product — a Video-only token
 * gets a `403` here while everything else in this app keeps working.
 */
const action: ActionDefinition = {
  key: "metric-get",
  type: "read",
  resource: "metric",
  title: "Get a viewer metric",
  description:
    "How the video performed for viewers — startup time, rebuffering, failures. Needs a token " +
    "created with the Mux Data product.",
  params: [
    {
      key: "metric",
      label: "Metric",
      type: "select",
      required: true,
      default: "video_startup_time",
      options: [
        { value: "video_startup_time", label: "Video startup time" },
        { value: "rebuffer_percentage", label: "Rebuffer percentage" },
        { value: "playback_failure_percentage", label: "Playback failure percentage" },
        { value: "exits_before_video_start", label: "Exits before video start" },
        { value: "video_quality_score", label: "Video quality score" },
        { value: "upscale_percentage", label: "Upscale percentage" },
      ],
    },
    {
      key: "timeframe",
      label: "Timeframe",
      type: "string",
      default: "7:days",
      placeholder: "7:days",
      hint: "Mux's own syntax — `24:hours`, `7:days`, `30:days`, or two Unix timestamps.",
    },
    {
      key: "filters",
      label: "Filters",
      type: "string",
      default: "",
      placeholder: "browser:Chrome,country:GB",
      hint: "Comma-separated `field:value` pairs. An overall number rarely says anything; the " +
        "same number sliced does.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Metric value" },
    { key: "total_row_count", type: "number", label: "Rows" },
    { key: "timeframe", type: "array", label: "Timeframe as Mux resolved it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const metric = String(p.metric ?? "").trim();
    if (!metric) throw new Error("`metric` is required");

    return await new MuxClient(ctx).request(
      `/data/v1/metrics/${encodeURIComponent(metric)}/overall`,
      {
        query: {
          "timeframe[]": String(p.timeframe ?? "7:days"),
          ...Object.fromEntries(
            (csv(p.filters) ?? []).map((f, i) => [`filters[${i}]`, f]),
          ),
        },
      },
    );
  },
};

export default action;
