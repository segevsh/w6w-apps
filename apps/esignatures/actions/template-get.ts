import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

/** `GET /api/templates/{id}` — title, created_at, placeholder fields and signer field IDs. */
interface Input {
  templateId: string;
}

const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Fetch a template, including its placeholder fields and signer field IDs.",
  params: [templateIdParam],
  output: [{ key: "template", type: "object", label: "The template" }],

  async execute(input, ctx) {
    return {
      template: await new ESignaturesClient(ctx).data(`/templates/${encodeId(input.templateId)}`),
    };
  },
};

export default templateGet;
