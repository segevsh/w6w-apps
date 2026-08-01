import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
  seconds: number;
}

const expire: ActionDefinition<Input> = {
  key: "expire",
  type: "perform",
  resource: "generic",
  title: "Set Expiry",
  description: "Set a key's time-to-live, in seconds.",
  // Setting the same TTL again converges to the same end state.
  idempotent: true,
  params: [
    keyParam(),
    {
      key: "seconds",
      label: "Seconds",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
  ],
  output: resultOutput("number", "1 if the TTL was set, 0 if the key does not exist"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<number>("expire", input.key, input.seconds);
  },
};

export default expire;
