import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, segment } from "../lib/client.ts";

/** `PUT /api/client/v2/lists/{id}` — Rename List. */
interface Input {
  id: string;
  name: string;
}

const listUpdate: ActionDefinition<Input> = {
  key: "list-update",
  type: "perform",
  resource: "list",
  title: "Rename List",
  description: "Rename a list.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "List ID",
      type: "string",
      required: true,
      hint: "List ID from the matching list action.",
    },
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "The list" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("PUT", `/lists/${segment(input.id, "List ID")}`, {
      body: compact({ name: need(input.name, "Name") }),
    });
  },
};

export default listUpdate;
