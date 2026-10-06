import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";

interface Input {
  name: string;
  parentId?: string;
  whatsAppBusinessAccountId?: string;
}

/** Create a template folder, optionally nested or tied to a WhatsApp Business Account. */
const templateFolderCreate: ActionDefinition<Input> = {
  key: "template-folder-create",
  type: "perform",
  resource: "template",
  title: "Create Template Folder",
  description:
    "Create a template folder, optionally nested or tied to a WhatsApp Business Account.",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    { "key": "parentId", "label": "Parent folder ID", "type": "string" },
    {
      "key": "whatsAppBusinessAccountId",
      "label": "WhatsApp Business Account ID",
      "type": "string",
    },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Folder ID" },
    { "key": "name", "type": "string", "label": "Name" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request("/template-folders", {
      method: "POST",
      body: {
        name: input.name,
        parent_id: input.parentId ?? null,
        whats_app_business_account_id: input.whatsAppBusinessAccountId ?? null,
      },
    });
  },
};

export default templateFolderCreate;
