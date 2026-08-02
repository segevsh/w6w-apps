import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient, normalizeCsv } from "../lib/client.ts";

interface Input {
  contactId: string;
  tags: string | string[];
}

const addTagToContact: ActionDefinition<Input> = {
  key: "add-tag-to-contact",
  type: "perform",
  resource: "contact",
  title: "Add Tags to Contact",
  description: "Add one or more tags to a contact. Existing tags are kept.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      hint: "Comma-separated tag names.",
    },
  ],
  output: [
    { key: "tags", type: "array", label: "Contact's tags after the update" },
  ],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request(`/contacts/${encodeURIComponent(input.contactId)}/tags`, {
      method: "POST",
      body: { tags: normalizeCsv(input.tags) ?? [] },
    });
  },
};

export default addTagToContact;
