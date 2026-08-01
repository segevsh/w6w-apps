import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
  value: string;
}

const rpush: ActionDefinition<Input> = {
  key: "rpush",
  type: "perform",
  resource: "list",
  title: "Push Right (List)",
  description: "Append a value to a list, creating it if it doesn't exist.",
  // A retry pushes the value again — a growing list has no natural end state.
  idempotent: false,
  params: [keyParam(), { key: "value", label: "Value", type: "text", required: true }],
  output: resultOutput("number", "Length of the list after the push"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<number>("rpush", input.key, input.value);
  },
};

export default rpush;
