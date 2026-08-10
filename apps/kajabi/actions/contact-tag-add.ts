import type { ActionDefinition } from "@w6w/types";
import { identifierList, KajabiClient } from "../lib/client.ts";
import { idListParam, relationshipOutput } from "../lib/params.ts";

/**
 * `POST /v1/contacts/{contact_id}/relationships/tags` — tag a contact.
 *
 * ## Additive, unlike its PATCH sibling
 *
 * This adds tags and leaves the contact's existing ones alone. The same path
 * also accepts `PATCH`, which **replaces** the whole tag set — that is
 * `contact-tag-replace`, kept as a separate action precisely so the destructive
 * one cannot be reached by accident from a form that looked like "set the
 * tags". Reaching for replace when you meant add is how another workflow's
 * segmentation quietly disappears.
 *
 * ## Batching is the API's own shape
 *
 * The request body is declared as an **array** of `{ id, type }` even for a
 * single tag, so tagging a contact with three tags is one request, not three.
 * `identifierList` builds that array from a comma-separated field.
 *
 * Idempotent: JSON:API says adding a member already in a to-many relationship
 * must not duplicate it, so re-running converges rather than accumulating.
 */
interface Input {
  contactId: string;
  tagIds: string;
}

const contactTagAdd: ActionDefinition<Input> = {
  key: "contact-tag-add",
  type: "perform",
  resource: "contact-tag",
  title: "Add Tags to Contact",
  description: "Attach one or more tags to a contact, leaving existing tags in place. Use " +
    "`contact-tag-replace` only if you intend to discard the contact's other tags.",
  idempotent: true,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "`contact-list` returns the ids.",
    },
    idListParam(
      "tagIds",
      "Tag IDs",
      "Comma-separated tag ids — sent as one request. `tag-list` returns the ids.",
    ),
  ],
  output: relationshipOutput,

  execute(input, ctx) {
    const data = identifierList(input.tagIds, "contact_tags");
    if (!data) throw new Error("Tag IDs: supply at least one tag id");
    return new KajabiClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/relationships/tags`,
      { method: "POST", body: { data } },
    );
  },
};

export default contactTagAdd;
