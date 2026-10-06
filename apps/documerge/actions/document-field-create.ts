import type { ActionDefinition } from "@w6w/types";
import { compact, DocuMergeClient } from "../lib/client.ts";

interface Input {
  documentId: number;
  name: string;
  fieldMap?: string;
}

const documentFieldCreate: ActionDefinition<Input> = {
  key: "document-field-create",
  type: "perform",
  resource: "document-field",
  title: "Create Document Field",
  description: "Add a merge field to a document.",
  idempotent: false,
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "number",
      required: true,
      hint: "From List Documents.",
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
      `/api/documents/fields/${encodeURIComponent(String(input.documentId))}`,
      { method: "POST", body: compact({ name: input.name, field_map: input.fieldMap }) },
    );
  },
};

export default documentFieldCreate;
