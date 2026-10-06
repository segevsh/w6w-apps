import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * List a data route's rules (GET /routes/{id}/rules).
 */
const routeRulesGet: ActionDefinition<Input> = {
  key: "route-rules-get",
  type: "read",
  resource: "route",
  title: "Get Data Route Rules",
  description: "List a data route's rules (GET /routes/{id}/rules).",
  params: [
    {
      key: "id",
      label: "Data route ID",
      type: "string",
      required: true,
      hint: "The numeric data route ID from Get a List of Data Routes.",
    },
  ],
  output: [
    { key: "rules", type: "array", label: "Array of rules" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/routes/${encodeURIComponent(input.id)}/rules`);
  },
};

export default routeRulesGet;
