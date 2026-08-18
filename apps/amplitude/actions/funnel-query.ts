import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient, json, query } from "../lib/client.ts";
import { END_PARAM, START_PARAM } from "../lib/params.ts";

/**
 * `GET /api/2/funnels` — conversion through an ordered sequence of events.
 *
 * ## The conversion window is the parameter that changes the answer most
 *
 * `cs` (conversion window, in seconds) decides how long a user has to complete
 * the funnel before they count as dropped. Amplitude's default is **7 days**.
 * A signup funnel measured over a 7-day window and the same funnel measured
 * over an hour are different questions with wildly different numbers, and
 * nothing in the response says which was asked.
 *
 * ## `mode` decides what "in order" means
 *
 * `ordered` requires the steps in sequence. `unordered` counts anyone who did
 * all of them in any order. `sequential` requires them consecutively with
 * nothing in between — which almost nothing passes, and is usually chosen by
 * accident.
 *
 * ## The response counts users at each step, not transitions between them
 *
 * `stepFunction` is cumulative: step 3's number is everyone who reached step 3,
 * not everyone who went from step 2 to step 3. Drop-off is the difference, and
 * this action computes it because doing it wrong is easy and looks right.
 */
const action: ActionDefinition = {
  key: "funnel-query",
  type: "search",
  resource: "chart",
  title: "Query a funnel",
  description:
    "Conversion through a sequence. The conversion WINDOW changes the answer more than anything " +
    "else and defaults to 7 days; the step counts are cumulative, so drop-off is computed here.",
  params: [
    {
      key: "events",
      label: "Steps",
      type: "json",
      required: true,
      default: "",
      hint: 'A JSON array of event objects in order, e.g. [{"event_type":"Signup Started"},' +
        '{"event_type":"Signup Completed"}]. At least two.',
    },
    START_PARAM,
    END_PARAM,
    {
      key: "conversionWindow",
      label: "Conversion Window (s)",
      type: "number",
      default: 604800,
      hint: "How long a user has to finish. Amplitude's default is 7 days (604800) — a signup " +
        "funnel measured over a week and over an hour are different questions.",
    },
    {
      key: "mode",
      label: "Order",
      type: "select",
      default: "ordered",
      options: [
        { value: "ordered", label: "Ordered — in sequence, other events allowed between" },
        { value: "unordered", label: "Unordered — all steps, any order" },
        { value: "sequential", label: "Sequential — consecutively, nothing in between" },
      ],
      hint: "`sequential` is far stricter than it sounds and is usually chosen by accident.",
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
    { key: "steps", type: "array", label: "Each step with its cumulative user count" },
    { key: "dropOff", type: "array", label: "Users lost between each pair of steps" },
    { key: "conversionRate", type: "number", label: "Last step over first, as a fraction" },
    { key: "data", type: "array", label: "Amplitude's own response" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const parsed = json(p.events, "events");
    const events = Array.isArray(parsed) ? parsed : [];
    if (events.length < 2) throw new Error("`events` needs at least two steps to be a funnel");
    const start = String(p.start ?? "").trim();
    const end = String(p.end ?? "").trim();
    if (!start || !end) throw new Error("`start` and `end` are both required");

    const url = new URLSearchParams();
    // Each step is its own `e` parameter, JSON-encoded.
    for (const event of events) url.append("e", JSON.stringify(event));
    for (
      const [key, value] of Object.entries(query({
        start,
        end,
        cs: Number(p.conversionWindow ?? 604800),
        mode: p.mode,
        g: p.groupBy,
      }))
    ) {
      url.append(key, String(value));
    }

    const result = await new AmplitudeClient(ctx).dashboard<{
      data?: Array<{ stepFunction?: number[]; events?: string[]; cumulativeRaw?: number[] }>;
    }>(`/api/2/funnels?${url.toString()}`);

    const first = result?.data?.[0];
    // stepFunction is cumulative — step 3 is everyone who reached it, not
    // everyone who went from 2 to 3.
    const counts = first?.cumulativeRaw ?? first?.stepFunction ?? [];
    const steps = counts.map((count, index) => ({
      step: index + 1,
      event: first?.events?.[index],
      users: count,
    }));
    const dropOff = counts.slice(1).map((count, index) => ({
      from: index + 1,
      to: index + 2,
      lost: Number(counts[index] ?? 0) - Number(count ?? 0),
    }));

    ctx.log("info", "queried an Amplitude funnel", { steps: steps.length });

    return {
      steps,
      dropOff,
      conversionRate: counts.length > 1 && Number(counts[0]) > 0
        ? Number(counts[counts.length - 1]) / Number(counts[0])
        : undefined,
      data: result?.data ?? [],
    };
  },
};

export default action;
