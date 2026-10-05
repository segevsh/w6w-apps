import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  tagId: string;
}

const contactTagRemove: ActionDefinition<Input> = {
  key: "contact-tag-remove",
  type: "perform",
  resource: "contact",
  title: "Remove Contact Tag",
  description: "Untag a contact (idempotent).",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "Contact id (BSON ObjectId hex).",
    },
    { key: "tagId", label: "Tag ID", type: "string", required: true, hint: "Tag id." },
  ],
  output: [
    {
      key: "success",
      type: "boolean",
      label: "Whether the call succeeded (the API answers 204 No Content)",
    },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "DELETE",
      `/contacts/${encodeId(input.contactId)}/tags/${encodeId(input.tagId)}`,
    );
    return result ?? { success: true };
  },
};

export default contactTagRemove;
