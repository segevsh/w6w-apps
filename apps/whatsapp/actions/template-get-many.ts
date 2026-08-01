import type { ActionDefinition } from "@w6w/types";
import { unset, WhatsAppClient } from "../lib/client.ts";

interface Input {
  name?: string;
  limit?: number;
}

/**
 * Scoped to the WhatsApp Business Account, not the phone number — Meta's
 * `message_templates` collection lives on the WABA and is shared by every
 * number under it. Needs the optional `wabaId` Auth field; a connection that
 * never recorded one gets a clear error rather than a silent 404.
 */
const templateGetMany: ActionDefinition<Input> = {
  key: "template-get-many",
  type: "read",
  resource: "template",
  title: "Get Many Templates",
  description:
    "List message templates on this WhatsApp Business Account, with their approval status.",
  params: [
    {
      key: "name",
      label: "Filter by name",
      type: "string",
      hint: "Exact template name. Leave blank to list every template.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      hint: "Max templates per page.",
    },
  ],
  output: [
    {
      key: "data",
      type: "array",
      label: "Templates (id, name, status, category, language, components)",
    },
    { key: "paging", type: "object", label: "Paging cursors" },
  ],

  execute(input, ctx) {
    return new WhatsAppClient(ctx).listTemplates({ name: unset(input.name), limit: input.limit });
  },
};

export default templateGetMany;
