import type { ActionDefinition } from "@w6w/types";
import { COMPANY, timeline, timelineParams } from "../lib/records.ts";

type Input = Record<string, unknown>;

const companyTimeline: ActionDefinition<Input> = {
  key: "company-timeline",
  type: "read",
  resource: "company",
  title: "Get Company Timeline",
  description:
    "List timeline entry references for a company. Use Get Messages to read their content.",
  params: timelineParams(COMPANY),
  output: [
    { key: "messages", type: "array", label: "Timeline references {key, changed}" },
    { key: "count", type: "number", label: "References returned" },
    { key: "stamp", type: "number", label: "Stamp for the next page" },
  ],

  execute(input, ctx) {
    return timeline(ctx, COMPANY, input);
  },
};

export default companyTimeline;
