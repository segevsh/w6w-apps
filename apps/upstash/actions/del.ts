import type { ActionDefinition } from "@w6w/types";
import { csv, UpstashClient } from "../lib/client.ts";
import { resultOutput } from "../lib/params.ts";

interface Input {
  keys: string;
}

const del: ActionDefinition<Input> = {
  key: "del",
  type: "perform",
  resource: "generic",
  title: "Delete Key(s)",
  description: "Delete one or more keys.",
  // Deleting an already-gone key is a no-op — safe to retry.
  idempotent: true,
  params: [
    {
      key: "keys",
      label: "Keys",
      type: "string",
      required: true,
      hint: "Comma-separated for multiple keys.",
    },
  ],
  output: resultOutput("number", "Number of keys removed"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<number>("del", ...csv(input.keys));
  },
};

export default del;
