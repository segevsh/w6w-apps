import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient } from "../lib/client.ts";

/**
 * `GET /api/2/annotations` — the vertical lines on every chart.
 *
 * An annotation marks a date across the whole project: a release, a marketing
 * push, an incident. They are what turns "the number changed on the 14th" into
 * "we shipped on the 14th", and they are the reason to have this app write into
 * Amplitude from a deploy pipeline at all.
 *
 * They are project-wide rather than per-chart, so an annotation added for one
 * question appears on every chart anybody looks at — which is the point, and
 * also why a workflow adding one per deploy needs to be deliberate about
 * volume.
 */
const action: ActionDefinition = {
  key: "annotation-list",
  type: "read",
  resource: "annotation",
  title: "List annotations",
  description:
    "The vertical lines on every chart — releases, campaigns, incidents. They are project-wide, " +
    "so one added for a single question appears everywhere.",
  params: [],
  output: [
    { key: "annotations", type: "array", label: "Annotations" },
    { key: "count", type: "number", label: "How many" },
    { key: "dates", type: "array", label: "Just the dates" },
  ],

  async execute(_input, ctx) {
    const result = await new AmplitudeClient(ctx).dashboard<{
      data?: Array<{ id?: number; date?: string; label?: string }>;
    }>("/api/2/annotations");

    const annotations = result?.data ?? [];
    return {
      annotations,
      count: annotations.length,
      dates: annotations.map((annotation) => annotation?.date).filter(Boolean),
    };
  },
};

export default action;
