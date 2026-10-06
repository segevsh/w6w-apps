import type { ActionDefinition } from "@w6w/types";
import { COMPANY, getParams, getRecord } from "../lib/records.ts";

type Input = Record<string, unknown>;

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch one company by Cloze ID, unique ID or (for people) e-mail address.",
  params: getParams(COMPANY),
  output: [
    { key: "syncKey", type: "string", label: "Cloze ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "stage", type: "string", label: "Stage" },
    { key: "segment", type: "string", label: "Segment" },
  ],

  execute(input, ctx) {
    return getRecord(ctx, COMPANY, input);
  },
};

export default companyGet;
