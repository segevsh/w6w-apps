import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  templateId: string;
}

/** Fetch one template by ID. */
const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Fetch one template by ID.",
  params: [
    { "key": "templateId", "label": "Template ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "status", "type": "string", "label": "Approval status" },
    { "key": "content", "type": "array", "label": "Content" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/templates/${seg(input.templateId)}`);
  },
};

export default templateGet;
