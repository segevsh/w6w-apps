import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, ESignaturesClient } from "../lib/client.ts";
import { placeholderFieldsParam, templateIdParam } from "../lib/params.ts";
import { firstTemplateId } from "./template-create.ts";

/**
 * `POST /api/templates/{id}/duplicate` — copy a template, optionally filling its placeholders.
 * `target_secret_token` can place the copy in a *different* account; it is a raw credential of
 * that other account and is deliberately not exposed here (credentials stay in `sign`).
 */
interface Input {
  templateId: string;
  title: string;
  placeholderFields?: unknown;
}

const templateDuplicate: ActionDefinition<Input> = {
  key: "template-duplicate",
  type: "perform",
  resource: "template",
  title: "Duplicate Template",
  description: "Duplicate a template under a new title, optionally customising its placeholders.",
  idempotent: false,
  params: [
    templateIdParam,
    { key: "title", label: "New title", type: "string", required: true },
    placeholderFieldsParam,
  ],
  output: [
    { key: "templateId", type: "string", label: "New template ID" },
    { key: "data", type: "array", label: "Raw vendor data" },
  ],

  async execute(input, ctx) {
    const data = await new ESignaturesClient(ctx).data(
      `/templates/${encodeId(input.templateId)}/duplicate`,
      {
        method: "POST",
        body: compact({
          title: input.title,
          placeholder_fields: asOptionalJson(input.placeholderFields, "placeholderFields"),
        }),
      },
    );
    return { templateId: firstTemplateId(data), data };
  },
};

export default templateDuplicate;
