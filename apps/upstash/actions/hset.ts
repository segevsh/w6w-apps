import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
  field: string;
  value: string;
}

const hset: ActionDefinition<Input> = {
  key: "hset",
  type: "perform",
  resource: "hash",
  title: "Set Field (Hash)",
  description: "Set the value of one field in a hash, creating the hash if it doesn't exist.",
  // Setting a field to a fixed value converges to the same end state on retry.
  idempotent: true,
  params: [
    keyParam(),
    { key: "field", label: "Field", type: "string", required: true },
    { key: "value", label: "Value", type: "text", required: true, config: { multiline: true } },
  ],
  output: resultOutput("number", "1 if the field is new, 0 if it was overwritten"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<number>("hset", input.key, input.field, input.value);
  },
};

export default hset;
