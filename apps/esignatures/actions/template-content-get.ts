import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

/** `GET /api/templates/{id}/content` — the template's content as markdown. */
interface Input {
  templateId: string;
}

const action: ActionDefinition<Input> = {
  key: "template-content-get",
  type: "read",
  resource: "template",
  title: "Get Template Content",
  description: "Fetch the template's content as extended markdown.",
  params: [templateIdParam],
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "markdown", type: "string", label: "Content as markdown" },
  ],

  async execute(input, ctx) {
    return await new ESignaturesClient(ctx).data(
      `/templates/${encodeId(input.templateId)}/content`,
    );
  },
};

export default action;
