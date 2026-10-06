import type { ActionDefinition } from "@w6w/types";
import { compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  routeId: number;
  fieldId: number;
  name: string;
  fieldMap?: string;
}

const routeFieldUpdate: ActionDefinition<Input> = {
  key: "route-field-update",
  type: "perform",
  resource: "route-field",
  title: "Update Route Field",
  description: "Rename a route merge field or change its map.",
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
      `/api/routes/fields/${encodeURIComponent(String(input.routeId))}/${
        encodeURIComponent(String(input.fieldId))
      }`,
      { method: "PUT", body: compact({ name: input.name, field_map: input.fieldMap }) },
    );
  },
};

export default routeFieldUpdate;
