import type { ActionDefinition } from "@w6w/types";
import { DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
  fieldId: number;
}

const routeFieldDelete: ActionDefinition<Input> = {
  key: "route-field-delete",
  type: "perform",
  resource: "route-field",
  title: "Delete Route Field",
  description: "Remove a merge field from a route.",
  idempotent: true,
  params: [
    {
      key: "routeId",
      label: "Route ID",
      type: "number",
      required: true,
      hint: "From List Routes.",
    },
    {
      key: "fieldId",
      label: "Field ID",
      type: "number",
      required: true,
      hint: "From List Route Fields.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when removed" },
  ],

  async execute(input, ctx) {
    return (await new DocuMergeClient(ctx).json(
      `/api/routes/fields/${encodeURIComponent(String(input.routeId))}/${
        encodeURIComponent(String(input.fieldId))
      }`,
      { method: "DELETE" },
    )) ?? { deleted: true };
  },
};

export default routeFieldDelete;
