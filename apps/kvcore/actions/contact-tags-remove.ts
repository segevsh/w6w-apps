import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  contact_id: string;
  tags: string[];
}

/**
 * `DELETE /v2/public/contact/{contact_id}/tags` — disassociate tags from a
 * contact (the tag itself is not deleted from the account, only its
 * association with this contact).
 *
 * The vendor's OpenAPI document declares no formal request-body schema for
 * this operation, but its own prose is explicit: **"JSON Payload
 * Description: An array of tag names to disassociate with the contact"** —
 * a bare JSON array, unlike the `{tags: [{name, locked}]}` object the sibling
 * PUT (`contact-tags-add`) takes. That asymmetry is the vendor's, not a
 * simplification made here.
 *
 * The vendor also documents that a locked tag can only be removed by an
 * admin-scoped token; a non-admin token will get a kvCORE-side refusal this
 * action surfaces as an ordinary HTTP error rather than trying to predict.
 */
const contactTagsRemove: ActionDefinition<Input> = {
  key: "contact-tags-remove",
  type: "perform",
  resource: "contact",
  title: "Remove Tags from Contact",
  description:
    "Disassociate one or more hashtags from a contact. The tag itself is not deleted from the " +
    "account. Locked tags can only be removed by an admin-scoped token.",
  idempotent: true,
  params: [
    { key: "contact_id", label: "Contact ID", type: "string", required: true },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      required: true,
      hint: "Tag names to remove, without the leading #.",
    },
  ],
  output: [
    { key: "contact_id", type: "number", label: "Contact ID" },
    { key: "tags", type: "array", label: "The contact's remaining tags" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(
      `/contact/${encodeURIComponent(input.contact_id)}/tags`,
      { method: "DELETE", body: input.tags },
    );
  },
};

export default contactTagsRemove;
