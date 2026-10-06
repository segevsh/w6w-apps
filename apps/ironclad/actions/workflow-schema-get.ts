import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";

interface Input {
  schemaId: string;
}

const workflowSchemaGet: ActionDefinition<Input> = {
  key: "workflow-schema-get",
  type: "read",
  resource: "workflow",
  title: "Get Workflow Schema",
  description:
    "Fetch one workflow template's launch form: every field id, type, display name and whether it is required.",
  params: [
    {
      key: "schemaId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "A `list[].id` from List Workflow Schemas.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Template ID" }, {
    key: "name",
    type: "string",
    label: "Template name",
  }, { key: "schema", type: "object", label: "Launch form fields" }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json(`/workflow-schemas/${encodeId(input.schemaId)}`, {
      query: { form: "launch" },
    });
  },
};

export default workflowSchemaGet;
