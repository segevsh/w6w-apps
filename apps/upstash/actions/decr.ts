import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
}

const decr: ActionDefinition<Input> = {
  key: "decr",
  type: "perform",
  resource: "string",
  title: "Decrement",
  description: "Decrement the integer value of a key by one.",
  // A retried decrement double-counts — never safe to retry blindly.
  idempotent: false,
  params: [keyParam()],
  output: resultOutput("number", "Value after the decrement"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<number>("decr", input.key);
  },
};

export default decr;
