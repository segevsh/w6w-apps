import type { ActionDefinition } from "@w6w/types";
import { identifierList, KajabiClient } from "../lib/client.ts";
import { idListParam, relationshipOutput } from "../lib/params.ts";

/**
 * `DELETE /v1/contacts/{contact_id}/relationships/tags` — untag a contact.
 *
 * Note the shape: this DELETE carries a **body** naming which tags to remove,
 * rather than putting the tag id in the path. That is JSON:API's to-many
 * relationship removal, and it is why `KajabiClient.request` supports a body on
 * any method rather than only on POST and PATCH.
 *
 * Removes only the tags named; the contact's other tags survive. Idempotent —
 * removing a tag the contact does not have converges on the same state.
 */
interface Input {
  contactId: string;
  tagIds: string;
}

const contactTagRemove: ActionDefinition<Input> = {
  key: "contact-tag-remove",
  type: "perform",
  resource: "contact-tag",
  title: "Remove Tags from Contact",
  description: "Detach one or more tags from a contact, leaving the contact's other tags intact.",
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
      "Comma-separated tag ids to remove. `contact-tag-list` returns what the contact has.",
    ),
  ],
  output: relationshipOutput,

  execute(input, ctx) {
    const data = identifierList(input.tagIds, "contact_tags");
    if (!data) throw new Error("Tag IDs: supply at least one tag id");
    return new KajabiClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/relationships/tags`,
      { method: "DELETE", body: { data } },
    );
  },
};

export default contactTagRemove;
