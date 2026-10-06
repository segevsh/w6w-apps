import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  template_name: string;
  origin_template_id: string;
}

/** `POST /api/1/duplicateTemplate/` */
const templateDuplicate: ActionDefinition<Input> = {
  key: "template-duplicate",
  type: "perform",
  title: "Duplicate Template",
  description:
    "Copy a template under a new name; returns the new template ID. Each call creates another copy.",
  idempotent: false,
  params: [
    {
      key: "template_name",
      label: "New template name",
      type: "string",
      required: true,
    },
    {
      key: "origin_template_id",
      label: "Original template ID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Identifier returned by the vendor" }],

  async execute(input, ctx) {
    const result = await call(ctx, "duplicateTemplate", {
      template_name: required("template_name", input.template_name),
      origin_template_id: required("origin_template_id", input.origin_template_id),
    });
    return { id: result === null || result === undefined ? null : String(result) };
  },
};

export default templateDuplicate;
