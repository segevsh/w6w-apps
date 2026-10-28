import type { ActionDefinition } from "@w6w/types";
import { peopleGet } from "../lib/people.ts";
import { resultOutput } from "../lib/params.ts";

const formList: ActionDefinition<Record<string, never>> = {
  key: "form-list",
  type: "read",
  resource: "form",
  title: "List Forms",
  description:
    "List the forms in the Zoho People account with their `formLinkName`, display name and permissions.",
  params: [],
  output: resultOutput,

  async execute(_input, ctx) {
    return await peopleGet(ctx, "/forms");
  },
};

export default formList;
