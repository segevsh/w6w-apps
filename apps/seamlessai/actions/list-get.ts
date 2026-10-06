import type { ActionDefinition } from "@w6w/types";
import { SeamlessClient, segment } from "../lib/client.ts";

/** `GET /api/client/v2/lists/{id}` — Get List. */
interface Input {
  id: string;
}

const listGet: ActionDefinition<Input> = {
  key: "list-get",
  type: "read",
  resource: "list",
  title: "Get List",
  description: "Get one list by ID.",
  params: [
    {
      key: "id",
      label: "List ID",
      type: "string",
      required: true,
      hint: "List ID from the matching list action.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "The list" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", `/lists/${segment(input.id, "List ID")}`);
  },
};

export default listGet;
