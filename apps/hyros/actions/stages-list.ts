import type { ActionDefinition } from "@w6w/types";
import { HyrosClient, pageQuery } from "../lib/client.ts";

interface Input {
  name?: string;
  pageSize?: number;
  pageId?: string;
}

const stagesList: ActionDefinition<Input> = {
  key: "stages-list",
  type: "read",
  resource: "stage",
  title: "List Lead Stages",
  description: "List the account's lead stages with the number of leads currently in each.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Search stages by name." },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 250, integer: true },
    },
    {
      key: "pageId",
      label: "Page cursor",
      type: "string",
      hint: "The nextPageId from the last page.",
    },
  ],
  output: [
    { key: "result", type: "array", label: "Stages ({name, amount})" },
    { key: "nextPageId", type: "string", label: "Cursor for the next page, or null" },
  ],

  async execute(input, ctx) {
    const { result, nextPageId } = await new HyrosClient(ctx).read("/stages", {
      name: input.name,
      ...pageQuery(input),
    });
    return { result, nextPageId };
  },
};

export default stagesList;
