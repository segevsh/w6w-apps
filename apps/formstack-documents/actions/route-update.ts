import type { ActionDefinition } from "@w6w/types";
import { compact, WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  rules?: Array<Record<string, unknown>>;
  outputName?: string;
  folder?: string;
}

/**
 * Update a data route; include a rule's id to modify it in place (PUT /routes/{id}).
 */
const routeUpdate: ActionDefinition<Input> = {
  key: "route-update",
  type: "perform",
  resource: "route",
  title: "Update Data Route",
  description: "Update a data route; include a rule's id to modify it in place (PUT /routes/{id}).",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Data route ID",
      type: "string",
      required: true,
      hint: "The numeric data route ID from Get a List of Data Routes.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "rules",
      label: "Rules",
      type: "json",
      hint:
        "Array of rules: { document_id | file, combine, sort, loop_field, conditions: [{ field, exp, value }] }. exp is one of ==, !=, <, <=, >, >=, contains, !contains. Include id to update an existing rule; combine_docx is also accepted.",
    },
    { key: "outputName", label: "Output file name", type: "string" },
    { key: "folder", label: "Folder", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Route ID" },
    { key: "rules", type: "array", label: "Rules" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/routes/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        rules: input.rules,
        output_name: input.outputName,
        folder: input.folder,
      }),
    });
  },
};

export default routeUpdate;
