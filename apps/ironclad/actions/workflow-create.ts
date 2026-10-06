import type { ActionDefinition } from "@w6w/types";
import { asJson, IroncladClient } from "../lib/client.ts";

interface Input {
  template: string;
  attributes: Record<string, unknown> | string;
  useDefaultValues?: boolean;
}

const workflowCreate: ActionDefinition<Input> = {
  key: "workflow-create",
  type: "perform",
  resource: "workflow",
  title: "Launch Workflow",
  description:
    "Launch a new workflow from a template, synchronously. Pass the launch form's fields as attributes; `counterpartyName` is always required. File attachments need a multipart request this app does not make; use a workflow whose form takes no files, or upload documents separately.",
  idempotent: false,
  params: [
    {
      key: "template",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "The workflow template's id — see List Workflow Schemas.",
    },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      required: true,
      hint:
        'The launch form values keyed by attribute id, e.g. {"counterpartyName": "Acme Corp"}. ' +
        "Read the template's form with Get Workflow Schema.",
    },
    {
      key: "useDefaultValues",
      label: "Use default values",
      type: "boolean",
      default: false,
      hint: "Fill attributes you leave out from the template's defaults.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Workflow ID" }, {
    key: "title",
    type: "string",
    label: "Title",
  }, { key: "step", type: "string", label: "Current step" }],

  execute(input, ctx) {
    const attributes = asJson<Record<string, unknown>>(input.attributes, "attributes");
    return new IroncladClient(ctx).json("/workflows", {
      method: "POST",
      query: { useDefaultValues: input.useDefaultValues ? true : undefined },
      body: { template: input.template, attributes },
    });
  },
};

export default workflowCreate;
