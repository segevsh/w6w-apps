import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
}

const get: ActionDefinition<Input> = {
  key: "get",
  type: "read",
  resource: "string",
  title: "Get Value",
  description: "Get the string value stored at a key.",
  params: [keyParam()],
  output: resultOutput("string", "Value (null if the key does not exist)"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<string | null>("get", input.key);
  },
};

export default get;
