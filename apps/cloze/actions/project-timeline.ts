import type { ActionDefinition } from "@w6w/types";
import { PROJECT, timeline, timelineParams } from "../lib/records.ts";

type Input = Record<string, unknown>;

const projectTimeline: ActionDefinition<Input> = {
  key: "project-timeline",
  type: "read",
  resource: "project",
  title: "Get Project Timeline",
  description:
    "List timeline entry references for a project. Use Get Messages to read their content.",
  params: timelineParams(PROJECT),
  output: [
    { key: "messages", type: "array", label: "Timeline references {key, changed}" },
    { key: "count", type: "number", label: "References returned" },
    { key: "stamp", type: "number", label: "Stamp for the next page" },
  ],

  execute(input, ctx) {
    return timeline(ctx, PROJECT, input);
  },
};

export default projectTimeline;
