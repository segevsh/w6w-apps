import type { ActionDefinition } from "@w6w/types";
import { compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
  name: string;
  fieldMap?: string;
}

const routeFieldCreate: ActionDefinition<Input> = {
  key: "route-field-create",
  type: "perform",
  resource: "route-field",
  title: "Create Route Field",
  description: "Add a merge field to a route.",
  idempotent: false,
  params: [
    {
      key: "routeId",
      label: "Route ID",
      type: "number",
      required: true,
      hint: "From List Routes.",
    },
    {
      key: "name",
      label: "Field name",
      type: "string",
      required: true,
      hint: "The merge-field name as it appears in the template.",
    },
    {
      key: "fieldMap",
      label: "Field map",
      type: "string",
      hint: "Optional mapping for the field.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The vendor's `data` envelope" },
  ],

  async execute(input, ctx) {
    return await new DocuMergeClient(ctx).json(
      `/api/routes/fields/${encodeURIComponent(String(input.routeId))}`,
      { method: "POST", body: compact({ name: input.name, field_map: input.fieldMap }) },
    );
  },
};

export default routeFieldCreate;
