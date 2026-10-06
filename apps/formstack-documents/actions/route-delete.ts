import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * Delete a data route (DELETE /routes/{id}).
 */
const routeDelete: ActionDefinition<Input> = {
  key: "route-delete",
  type: "perform",
  resource: "route",
  title: "Delete Data Route",
  description: "Delete a data route (DELETE /routes/{id}).",
  idempotent: true,
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
    { key: "success", type: "string", label: '"1" on success' },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/routes/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default routeDelete;
