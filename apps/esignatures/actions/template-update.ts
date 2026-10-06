import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, ESignaturesClient, toList } from "../lib/client.ts";
import { labelsParam, templateIdParam } from "../lib/params.ts";

/** `POST /api/templates/{id}` — change a template's title and/or labels. */
interface Input {
  templateId: string;
  title?: string;
  labels?: string;
}

const templateUpdate: ActionDefinition<Input> = {
  key: "template-update",
  type: "perform",
  resource: "template",
  title: "Update Template",
  description: "Update a template's title or labels.",
  idempotent: true,
  params: [templateIdParam, { key: "title", label: "Title", type: "string" }, labelsParam],
  output: [{ key: "status", type: "string", label: "updated" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(`/templates/${encodeId(input.templateId)}`, {
      method: "POST",
      body: compact({ title: input.title, labels: toList(input.labels) }),
    });
  },
};

export default templateUpdate;
