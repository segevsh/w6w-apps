import type { ActionDefinition } from "@w6w/types";
import { compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
  fieldId: number;
  name: string;
  fieldMap?: string;
}

const documentFieldUpdate: ActionDefinition<Input> = {
  key: "document-field-update",
  type: "perform",
  resource: "document-field",
  title: "Update Document Field",
  description: "Rename a document merge field or change its map.",
  idempotent: true,
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "number",
      required: true,
      hint: "From List Documents.",
    },
    {
      key: "fieldId",
      label: "Field ID",
      type: "number",
      required: true,
      hint: "From List Document Fields.",
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
      `/api/documents/fields/${encodeURIComponent(String(input.documentId))}/${
        encodeURIComponent(String(input.fieldId))
      }`,
      { method: "PUT", body: compact({ name: input.name, field_map: input.fieldMap }) },
    );
  },
};

export default documentFieldUpdate;
