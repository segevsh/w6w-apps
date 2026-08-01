import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
  field: string;
}

const hget: ActionDefinition<Input> = {
  key: "hget",
  type: "read",
  resource: "hash",
  title: "Get Field (Hash)",
  description: "Get the value of one field in a hash.",
  params: [keyParam(), { key: "field", label: "Field", type: "string", required: true }],
  output: resultOutput("string", "Field value (null if the field or key does not exist)"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<string | null>("hget", input.key, input.field);
  },
};

export default hget;
