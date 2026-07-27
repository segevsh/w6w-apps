import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

/** GET /labels — list all personal labels for the authenticated user. */
const labelGetMany: ActionDefinition<Record<string, never>> = {
  key: "label-get-many",
  type: "read",
  resource: "label",
  title: "Get Many Labels",
  description: "List all personal labels.",
  params: [],
  output: [
    { key: "results", type: "array", label: "Labels" },
  ],

  execute(_input, ctx) {
    const client = new TodoistClient(ctx);
    return client.request("/labels");
  },
};

export default labelGetMany;
