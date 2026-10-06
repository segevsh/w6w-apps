import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
  attributes?: boolean;
}

/**
 * List a document's merge fields; set attributes to include every field attribute (GET /documents/{id}/fields).
 */
const documentFieldsGet: ActionDefinition<Input> = {
  key: "document-fields-get",
  type: "read",
  resource: "document",
  title: "Get Document Fields",
  description:
    "List a document's merge fields; set attributes to include every field attribute (GET /documents/{id}/fields).",
  params: [
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The numeric document ID from Get a List of Documents.",
    },
    {
      key: "attributes",
      label: "Include attributes",
      type: "boolean",
      hint: "Return all field attributes, not just key and name.",
    },
  ],
  output: [
    { key: "fields", type: "array", label: "Array of { key, name }" },
  ],

  execute(input, ctx) {
    return new WebMergeClient(ctx).request(`/documents/${encodeURIComponent(input.id)}/fields`, {
      query: { attributes: input.attributes ? 1 : undefined },
    });
  },
};

export default documentFieldsGet;
