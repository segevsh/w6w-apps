import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { relationshipOutput } from "../lib/params.ts";

/**
 * `GET /v1/contacts/{contact_id}/relationships/tags` — which tags a contact has.
 *
 * A JSON:API *relationship* endpoint, so it returns resource identifiers only:
 * `{ data: [{ id, type }] }`, with no tag names. That is the specification's
 * behaviour, not an omission — follow up with `tag-list` to resolve names, or
 * use `contact-get` with `include=tags` to get both in one request.
 *
 * Note the absence of pagination parameters: the spec declares none on this
 * operation, so this app declares none either rather than sending page
 * parameters the server has not agreed to honour.
 */
interface Input {
  contactId: string;
}

const contactTagList: ActionDefinition<Input> = {
  key: "contact-tag-list",
  type: "read",
  resource: "contact-tag",
  title: "List Contact's Tags",
  description:
    "List the tag ids attached to a contact. Returns identifiers only — use `contact-get` with " +
    "`include=tags` if you need the names too.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "`contact-list` returns the ids.",
    },
  ],
  output: relationshipOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/relationships/tags`,
    );
  },
};

export default contactTagList;
