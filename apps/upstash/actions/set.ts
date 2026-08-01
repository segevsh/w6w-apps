import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
  value: string;
  ttlSeconds?: number;
}

const set: ActionDefinition<Input> = {
  key: "set",
  type: "perform",
  resource: "string",
  title: "Set Value",
  description: "Set a key to a string value, optionally expiring it after N seconds.",
  // Setting a key to a fixed value (and TTL) converges to the same end state
  // no matter how many times the call is retried.
  idempotent: true,
  params: [
    keyParam(),
    { key: "value", label: "Value", type: "text", required: true, config: { multiline: true } },
    {
      key: "ttlSeconds",
      label: "TTL (seconds)",
      type: "number",
      advanced: true,
      hint: "Expire the key after this many seconds (Redis EX). Leave blank for no expiry.",
      validation: { min: 1, integer: true },
    },
  ],
  output: resultOutput("string", '"OK" on success'),

  execute(input, ctx) {
    const args: Array<string | number> = ["set", input.key, input.value];
    if (input.ttlSeconds !== undefined) args.push("EX", input.ttlSeconds);
    return new UpstashClient(ctx).command<string>(...args);
  },
};

export default set;
