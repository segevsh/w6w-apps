import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient, seg } from "../lib/client.ts";

interface Input {
  templateId: string;
  fields?: string;
}

const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Fetch one template or snippet by id.",
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "The snippet `_id`.",
    },
    { key: "fields", label: "Fields", type: "string", hint: "Comma-separated fields to return." },
  ],
  output: [{ key: "template", type: "object", label: "Template" }],

  async execute(input, ctx) {
    const template = await new MixmaxClient(ctx).request(
      "GET",
      `/snippets/${seg(input.templateId)}`,
      {
        query: { fields: input.fields },
      },
    );
    return { template };
  },
};

export default templateGet;
