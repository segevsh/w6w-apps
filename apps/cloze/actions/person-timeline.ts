import type { ActionDefinition } from "@w6w/types";
import { PERSON, timeline, timelineParams } from "../lib/records.ts";

type Input = Record<string, unknown>;

const personTimeline: ActionDefinition<Input> = {
  key: "person-timeline",
  type: "read",
  resource: "person",
  title: "Get Person Timeline",
  description:
    "List timeline entry references for a person. Use Get Messages to read their content.",
  params: timelineParams(PERSON),
  output: [
    { key: "messages", type: "array", label: "Timeline references {key, changed}" },
    { key: "count", type: "number", label: "References returned" },
    { key: "stamp", type: "number", label: "Stamp for the next page" },
  ],

  execute(input, ctx) {
    return timeline(ctx, PERSON, input);
  },
};

export default personTimeline;
