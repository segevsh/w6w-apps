import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * List the merge fields across every document in a route's rules (GET /routes/{id}/fields).
 */
const routeFieldsGet: ActionDefinition<Input> = {
  key: "route-fields-get",
  type: "read",
  resource: "route",
  title: "Get Data Route Fields",
  description:
    "List the merge fields across every document in a route's rules (GET /routes/{id}/fields).",
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
    { key: "fields", type: "array", label: "Array of { key, name }" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/routes/${encodeURIComponent(input.id)}/fields`);
  },
};

export default routeFieldsGet;
