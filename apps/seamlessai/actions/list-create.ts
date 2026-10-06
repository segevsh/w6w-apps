import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient } from "../lib/client.ts";

/** `POST /api/client/v2/lists` — Create List. */
interface Input {
  name: string;
}

const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create a new list.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "The list" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("POST", "/lists", {
      body: compact({ name: need(input.name, "Name") }),
    });
  },
};

export default listCreate;
