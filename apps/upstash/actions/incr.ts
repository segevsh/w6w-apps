import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
}

const incr: ActionDefinition<Input> = {
  key: "incr",
  type: "perform",
  resource: "string",
  title: "Increment",
  description: "Increment the integer value of a key by one.",
  // A retried increment double-counts — never safe to retry blindly.
  idempotent: false,
  params: [keyParam()],
  output: resultOutput("number", "Value after the increment"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<number>("incr", input.key);
  },
};

export default incr;
