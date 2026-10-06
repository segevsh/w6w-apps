import type { ActionDefinition } from "@w6w/types";
import { compact, ESignaturesClient, toList } from "../lib/client.ts";
import { labelsParam } from "../lib/params.ts";

/**
 * `POST /api/templates` — create a template from markdown. Note the vendor answers
 * `data` as an **array** with one `{template_id}` entry (not an object); `templateId` is lifted out.
 */
interface Input {
  title: string;
  markdown: string;
  labels?: string;
}

const templateCreate: ActionDefinition<Input> = {
  key: "template-create",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description: "Create a new template from extended markdown.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "markdown",
      label: "Markdown",
      type: "text",
      required: true,
      hint: "Extended markdown; may embed {{placeholders}} and signer fields.",
    },
    labelsParam,
  ],
  output: [
    { key: "templateId", type: "string", label: "New template ID" },
    { key: "data", type: "array", label: "Raw vendor data" },
  ],

  async execute(input, ctx) {
    const data = await new ESignaturesClient(ctx).data("/templates", {
      method: "POST",
      body: compact({ title: input.title, markdown: input.markdown, labels: toList(input.labels) }),
    });
    return { templateId: firstTemplateId(data), data };
  },
};

/** Vendor quirk: `data` is `[{template_id}]`, but tolerate a plain object too. */
export function firstTemplateId(data: unknown): string | undefined {
  const first = Array.isArray(data) ? data[0] : data;
  return (first as { template_id?: string } | undefined)?.template_id;
}

export default templateCreate;
