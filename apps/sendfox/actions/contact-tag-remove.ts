import type { ActionDefinition } from "@w6w/types";
import { encodeId, SendfoxClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /contacts/{contact_id}/tags/{tag_id}` — remove a tag from a contact.
 *
 * Returns the contact's tags *after* the change — a bare array of `ContactTag`.
 * Removing a tag the contact does not have causes no further change, so this is
 * safe to retry; the API answers `404` if the contact or the tag itself does not
 * exist.
 */
interface Input {
  contactId: number;
  tagId: number;
}

const contactTagRemove: ActionDefinition<Input> = {
  key: "contact-tag-remove",
  type: "perform",
  resource: "contact-tag",
  title: "Remove Tag from Contact",
  description: "Detach a contact tag from a contact.",
  idempotent: true,
  params: [
    idParam("contactId", "Contact", "Contact id to untag."),
    idParam("tagId", "Tag", "Tag id to remove from the contact."),
  ],
  output: [{ key: "", type: "array", label: "The contact's tags after the change" }],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json(
      `/contacts/${encodeId(input.contactId)}/tags/${encodeId(input.tagId)}`,
      { method: "DELETE" },
    );
  },
};

export default contactTagRemove;
