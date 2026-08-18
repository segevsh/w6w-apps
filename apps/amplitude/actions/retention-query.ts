import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient, json, query } from "../lib/client.ts";
import { END_PARAM, START_PARAM } from "../lib/params.ts";

/**
 * `GET /api/2/retention` — do people come back.
 *
 * ## `rm` is the whole question, and the three answers differ enormously
 *
 * - **`n` (N-day)** — did they return on *exactly* that day. Day-7 retention
 *   counts only people active on day 7 itself, so the curve is jagged and
 *   weekly products look terrible on weekdays.
 * - **`rolling`** — did they return on that day *or any day after*. Always the
 *   highest of the three, monotonically non-increasing, and the one most people
 *   mean when they say "retention".
 * - **`brackets`** — grouped ranges, e.g. days 1–3, 4–7.
 *
 * The same data produces three different curves. A retention number quoted
 * without its mode is not a number.
 *
 * ## The two events are different roles
 *
 * `se` is the *starting* event — what counts as being acquired. `re` is the
 * *returning* event — what counts as coming back. They are usually different
 * (signed up, then used the product), and setting both to the same event
 * measures repeat usage rather than retention.
 */
const action: ActionDefinition = {
  key: "retention-query",
  type: "search",
  resource: "chart",
  title: "Query retention",
  description:
    "Do people come back. The retention MODE — N-day, rolling or brackets — changes the same " +
    "data into three very different curves, so a number without its mode means nothing.",
  params: [
    {
      key: "startEvent",
      label: "Starting Event",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"event_type":"Signup Completed"}',
      hint: "What counts as being acquired. `_new` for new users, `_active` for active ones.",
    },
    {
      key: "returnEvent",
      label: "Returning Event",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"event_type":"_active"}',
      hint: "What counts as coming back. Setting this the same as the starting event measures " +
        "repeat usage, not retention.",
    },
    START_PARAM,
    END_PARAM,
    {
      key: "mode",
      label: "Retention Mode",
      type: "select",
      default: "n",
      options: [
        { value: "n", label: "N-day — returned on exactly that day" },
        { value: "rolling", label: "Rolling — returned then or any day after" },
        { value: "brackets", label: "Brackets — grouped day ranges" },
      ],
    },
    {
      key: "interval",
      label: "Interval",
      type: "select",
      default: "1",
      options: [
        { value: "1", label: "Daily" },
        { value: "7", label: "Weekly" },
        { value: "30", label: "Monthly" },
      ],
    },
    {
      key: "groupBy",
      label: "Group By",
      type: "string",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "series", type: "object", label: "Retention by cohort date" },
    { key: "cohorts", type: "array", label: "The cohort dates" },
    { key: "mode", type: "string", label: "Which mode produced these numbers" },
    { key: "data", type: "object", label: "Amplitude's own response" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const startEvent = json(p.startEvent, "startEvent");
    const returnEvent = json(p.returnEvent, "returnEvent");
    if (!startEvent) throw new Error("`startEvent` is required");
    if (!returnEvent) throw new Error("`returnEvent` is required");
    const start = String(p.start ?? "").trim();
    const end = String(p.end ?? "").trim();
    if (!start || !end) throw new Error("`start` and `end` are both required");

    const mode = String(p.mode ?? "n");
    const result = await new AmplitudeClient(ctx).dashboard<{
      data?: { series?: Record<string, unknown>; dates?: string[] };
    }>("/api/2/retention", {
      query: query({
        se: JSON.stringify(startEvent),
        re: JSON.stringify(returnEvent),
        start,
        end,
        rm: mode,
        i: p.interval,
        g: p.groupBy,
      }),
    });

    const data = result?.data ?? {};
    ctx.log("info", "queried Amplitude retention", {
      mode,
      cohorts: (data.dates ?? []).length,
    });

    return {
      series: data.series ?? {},
      cohorts: data.dates ?? [],
      // Returned because the same data means three different things by mode.
      mode,
      data,
    };
  },
};

export default action;
