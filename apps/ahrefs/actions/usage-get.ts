import type { ActionDefinition } from "@w6w/types";
import { AhrefsClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

/** `GET /subscription-info/limits-and-usage` — response key `limits_and_usage`. */
const usageGet: ActionDefinition<Input> = {
  key: "usage-get",
  type: "read",
  resource: "subscription",
  title: "Get Limits and Usage",
  description:
    "Read the plan, the API key's expiry and the API units this key and workspace have used and may use, plus the reset date. Free \u2014 consumes no units.",
  params: [],
  output: [
    { key: "limits_and_usage", type: "object", label: "Limits and usage" },
    { key: "unitsCost", type: "number", label: "API units this call consumed" },
    { key: "rows", type: "number", label: "Rows returned" },
  ],

  execute(_input, ctx) {
    return new AhrefsClient(ctx).report("/subscription-info/limits-and-usage", {});
  },
};

export default usageGet;
