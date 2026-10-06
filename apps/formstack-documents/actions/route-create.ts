import type { ActionDefinition } from "@w6w/types";
import { compact, WebMergeClient } from "../lib/client.ts";

interface Input {
  name: string;
  rules: Array<Record<string, unknown>>;
  outputName?: string;
  folder?: string;
}

/**
 * Create a data route that merges several documents from one POST (POST /routes).
 */
const routeCreate: ActionDefinition<Input> = {
  key: "route-create",
  type: "perform",
  resource: "route",
  title: "Create Data Route",
  description: "Create a data route that merges several documents from one POST (POST /routes).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "rules",
      label: "Rules",
      type: "json",
      required: true,
      hint:
        "Array of rules: { document_id | file, combine, sort, loop_field, conditions: [{ field, exp, value }] }. exp is one of ==, !=, <, <=, >, >=, contains, !contains.",
    },
    {
      key: "outputName",
      label: "Output file name",
      type: "string",
      hint: "Name of the combined PDF.",
    },
    { key: "folder", label: "Folder", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Route ID" },
    { key: "key", type: "string", label: "Merge key" },
    { key: "url", type: "string", label: "Merge URL" },
    { key: "rules", type: "array", label: "Rules with IDs" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request("/routes", {
      method: "POST",
      body: compact({
        name: input.name,
        rules: input.rules,
        output_name: input.outputName,
        folder: input.folder,
      }),
    });
  },
};

export default routeCreate;
