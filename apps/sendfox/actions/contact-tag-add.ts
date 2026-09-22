import type { ActionDefinition } from "@w6w/types";
import { encodeId, SendfoxClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /contacts/{contact_id}/tags/{tag_id}` — attach a tag to a contact.
 *
 * The document states plainly that this is **idempotent** and that it returns
 * the contact's tags *after* the change — a bare array of `ContactTag`, not an
 * envelope. That response shape is why this action can be marked safe to retry
 * without a second call doing anything: attaching an already-attached tag is a
 * no-op that still answers `200`.
 */
interface Input {
  contactId: number;
  tagId: number;
}

const contactTagAdd: ActionDefinition<Input> = {
  key: "contact-tag-add",
  type: "perform",
  resource: "contact-tag",
  title: "Add Tag to Contact",
  description: "Attach a contact tag to a contact. Idempotent.",
  idempotent: true,
  params: [
    idParam("contactId", "Contact", "Contact id to tag."),
    idParam("tagId", "Tag", "Tag id, from List Contact Tags."),
  ],
  output: [{ key: "", type: "array", label: "The contact's tags after the change" }],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json(
      `/contacts/${encodeId(input.contactId)}/tags/${encodeId(input.tagId)}`,
      { method: "POST" },
    );
  },
};

export default contactTagAdd;
