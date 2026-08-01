import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
}

const exists: ActionDefinition<Input> = {
  key: "exists",
  type: "read",
  resource: "generic",
  title: "Check Exists",
  description: "Check whether a key exists.",
  params: [keyParam()],
  output: resultOutput("number", "1 if the key exists, 0 otherwise"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<number>("exists", input.key);
  },
};

export default exists;
