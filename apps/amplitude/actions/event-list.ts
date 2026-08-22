import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient } from "../lib/client.ts";

/**
 * `GET /api/2/events/list` — the event types this project knows about.
 *
 * The taxonomy, as it actually is rather than as anybody intended. It is the
 * first thing to run before writing a segmentation query, because the
 * `event_type` there has to match exactly and Amplitude is unforgiving about
 * case and whitespace — `Checkout Completed` and `checkout completed` are two
 * events, both real, each with half the data.
 *
 * ## `non_active` and `deleted` are how a taxonomy gets cleaned
 *
 * An event can be **hidden** (`non_active`) or **deleted** without disappearing
 * from this list. Hidden events keep collecting data and stop appearing in the
 * UI's pickers; deleted ones stop being queryable. Both are still listed, which
 * makes this the only place to see that the event a chart depends on was
 * quietly hidden by somebody tidying up.
 */
const action: ActionDefinition = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List event types",
  description:
    "The project's event taxonomy as it actually is. Hidden and deleted events are still listed " +
    "— which is the only way to notice that a chart's event was tidied away.",
  params: [
    {
      key: "includeInactive",
      label: "Include Hidden And Deleted",
      type: "boolean",
      default: true,
      hint: "Off returns only events that are live in the UI.",
    },
  ],
  output: [
    { key: "events", type: "array", label: "Event types" },
    { key: "count", type: "number", label: "How many" },
    { key: "hidden", type: "number", label: "Hidden — still collecting, absent from the UI" },
    { key: "deleted", type: "number", label: "Deleted — no longer queryable" },
    { key: "names", type: "array", label: "Just the event_type values" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const result = await new AmplitudeClient(ctx).dashboard<
      | { data?: Array<{ value?: string; non_active?: boolean; deleted?: boolean }> }
      | Array<
        { value?: string; non_active?: boolean; deleted?: boolean }
      >
    >("/api/2/events/list");

    // The endpoint has answered both bare and wrapped over its life.
    const all = Array.isArray(result) ? result : (result?.data ?? []);
    const hidden = all.filter((event) => event?.non_active === true).length;
    const deleted = all.filter((event) => event?.deleted === true).length;

    const events = p.includeInactive === false
      ? all.filter((event) => event?.non_active !== true && event?.deleted !== true)
      : all;

    return {
      events,
      count: events.length,
      hidden,
      deleted,
      names: events.map((event) => event?.value).filter(Boolean),
    };
  },
};

export default action;
