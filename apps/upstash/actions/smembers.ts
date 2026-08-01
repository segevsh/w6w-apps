import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
}

const smembers: ActionDefinition<Input> = {
  key: "smembers",
  type: "read",
  resource: "set",
  title: "Get Members (Set)",
  description: "Get every member of a set.",
  params: [keyParam()],
  output: resultOutput("array", "Set members ([] if the key does not exist)"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<string[]>("smembers", input.key);
  },
};

export default smembers;
