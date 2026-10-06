import type { ActionDefinition } from "@w6w/types";
import { asObject, DocuMergeClient } from "../lib/client.ts";

interface Input {
  key: string;
  data?: unknown;
}

const routeMerge: ActionDefinition<Input> = {
  key: "route-merge",
  type: "perform",
  resource: "route",
  title: "Merge Route",
  description:
    "Queue a merge of a route by its key. Asynchronous; results go to the route's delivery methods.",
  idempotent: false,
  params: [
    {
      key: "key",
      label: "Route key",
      type: "string",
      required: true,
      hint: "The `key` of the route (from Get Route), not its numeric id.",
    },
    {
      key: "data",
      label: "Merge data",
      type: "json",
      hint:
        "JSON object of field values to merge, keyed by field name. Sent verbatim as the request body.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Vendor confirmation" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/routes/merge/${encodeURIComponent(String(input.key))}`,
      { method: "POST", body: asObject(input.data, "Merge data") },
    );
  },
};

export default routeMerge;
