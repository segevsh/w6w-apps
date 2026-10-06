import type { ActionDefinition } from "@w6w/types";
import { encodeId, OnePageClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  tagName: string;
}

/** `PUT /contacts/{contact_id}/assign_tag/{tag_name}` — tag names match existing tags case-insensitively. */
const assignContactTag: ActionDefinition<Input> = {
  key: "assign-contact-tag",
  type: "perform",
  resource: "contact",
  title: "Assign Tag to Contact",
  description: "Add a tag to a contact without touching its other fields.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "tagName", label: "Tag", type: "string", required: true },
  ],
  output: [{ key: "assigned", type: "boolean", label: "True when the call succeeded" }],

  async execute(input, ctx) {
    await new OnePageClient(ctx).data(
      `/contacts/${encodeId(input.contactId)}/assign_tag/${encodeId(input.tagName)}`,
      { method: "PUT" },
    );
    return { assigned: true };
  },
};

export default assignContactTag;
