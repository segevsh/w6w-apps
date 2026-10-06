import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  templateId: string;
}

/** Delete a template. This cannot be undone. */
const templateDelete: ActionDefinition<Input> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Delete a template. This cannot be undone.",
  idempotent: true,
  params: [
    { "key": "templateId", "label": "Template ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID of the deleted object" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/templates/${seg(input.templateId)}`, {
      method: "DELETE",
    });
  },
};

export default templateDelete;
