import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formStatusOptions } from "../lib/params.ts";

interface Input {
  blocks: unknown;
  status: string;
  workspaceId?: string;
  templateId?: string;
  folderId?: string;
  settings?: unknown;
}

/**
 * POST /forms — create a form. `blocks` and `status` are the required fields.
 *
 * `blocks` is passed through as JSON rather than modelled as form params. That
 * is deliberate: a Tally block is a 45-member discriminated union
 * (`FormTitleBlock`, `InputTextBlock`, `MatrixRowBlock`, … each with its own
 * `payload`), and flattening it into a fixed param list would either lose most
 * block types or invent a schema Tally does not have. The authoritative shape
 * is the vendor's blocks reference:
 * https://developers.tally.so/blocks-reference — and the easiest way to get a
 * valid array is to read one back off Get Form.
 */
const formCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "form-create",
  type: "perform",
  resource: "form",
  title: "Create Form",
  description: "Create a form from a block array.",
  // Nothing de-duplicates a create: replaying this makes a second form.
  idempotent: false,
  params: [
    {
      key: "blocks",
      label: "Blocks",
      type: "json",
      required: true,
      hint:
        "Array of Tally block objects. See https://developers.tally.so/blocks-reference, or copy the `blocks` array from Get Form.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      default: "PUBLISHED",
      options: formStatusOptions,
      hint: "Initial status of the form.",
    },
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      hint: "Optional. Defaults to the user's default workspace.",
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      hint: "Optional. Base the new form on a template.",
    },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint: "Optional. Must belong to the target workspace.",
    },
    {
      key: "settings",
      label: "Settings",
      type: "json",
      hint: "Optional form settings object (language, close date, redirect, notifications, …).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "form", type: "object", label: "The created form" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating Tally form", { workspaceId: input.workspaceId });
    const form = await new TallyClient(ctx).request<Record<string, unknown>>("/forms", {
      method: "POST",
      body: {
        blocks: input.blocks,
        status: input.status,
        workspaceId: input.workspaceId,
        templateId: input.templateId,
        folderId: input.folderId,
        settings: input.settings,
      },
    });
    return { id: form?.id, name: form?.name, status: form?.status, form };
  },
};

export default formCreate;
