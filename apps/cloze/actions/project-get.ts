import type { ActionDefinition } from "@w6w/types";
import { getParams, getRecord, PROJECT } from "../lib/records.ts";

type Input = Record<string, unknown>;

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project by Cloze ID, unique ID or (for people) e-mail address.",
  params: getParams(PROJECT),
  output: [
    { key: "syncKey", type: "string", label: "Cloze ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "stage", type: "string", label: "Stage" },
    { key: "segment", type: "string", label: "Segment" },
  ],

  execute(input, ctx) {
    return getRecord(ctx, PROJECT, input);
  },
};

export default projectGet;
