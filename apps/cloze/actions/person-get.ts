import type { ActionDefinition } from "@w6w/types";
import { getParams, getRecord, PERSON } from "../lib/records.ts";

type Input = Record<string, unknown>;

const personGet: ActionDefinition<Input> = {
  key: "person-get",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Fetch one person by Cloze ID, unique ID or (for people) e-mail address.",
  params: getParams(PERSON),
  output: [
    { key: "syncKey", type: "string", label: "Cloze ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "stage", type: "string", label: "Stage" },
    { key: "segment", type: "string", label: "Segment" },
  ],

  execute(input, ctx) {
    return getRecord(ctx, PERSON, input);
  },
};

export default personGet;
