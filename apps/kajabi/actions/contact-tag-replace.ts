import type { ActionDefinition } from "@w6w/types";
import { identifierList, KajabiClient } from "../lib/client.ts";
import { idListParam, relationshipOutput } from "../lib/params.ts";

/**
 * `PATCH /v1/contacts/{contact_id}/relationships/tags` — set the contact's tags.
 *
 * ## Destructive: this is a replace, not an add
 *
 * Every tag not named here is **removed** from the contact. That is the point
 * of the endpoint — it is what makes one-way sync from an external system
 * possible — but it is also the one operation in this app that can silently
 * undo another workflow's segmentation. `contact-tag-add` and
 * `contact-tag-remove` exist so that nobody has to use this one unless
 * replacement is genuinely what they mean.
 *
 * ## Why an empty list is refused
 *
 * JSON:API defines `PATCH` with an empty array as "clear the relationship", and
 * Kajabi would honour it. This action rejects a blank field instead. The reason
 * is the failure mode, not the semantics: a blank input here is far more often
 * an unset template variable than a deliberate "strip every tag", and the two
 * are indistinguishable on the wire. Stripping every tag from a contact because
 * an upstream step returned nothing is not a recoverable mistake — the previous
 * tag set is gone and this API has no history to restore it from.
 *
 * A workflow that really does want to clear all tags can read the current set
 * with `contact-tag-list` and pass it to `contact-tag-remove`, which states the
 * intent explicitly.
 */
interface Input {
  contactId: string;
  tagIds: string;
}

const contactTagReplace: ActionDefinition<Input> = {
  key: "contact-tag-replace",
  type: "perform",
  resource: "contact-tag",
  title: "Replace Contact's Tags",
  description:
    "Set a contact's tags to exactly this list. Destructive — any tag not listed is removed. " +
    "Use `contact-tag-add` unless you specifically want replacement.",
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
      "Comma-separated — the contact's complete tag set after this call. Every tag omitted " +
        "here is removed. Cannot be blank: see the action's notes.",
    ),
  ],
  output: relationshipOutput,

  execute(input, ctx) {
    const data = identifierList(input.tagIds, "contact_tags");
    if (!data) {
      throw new Error(
        "Tag IDs: supply at least one tag id. Replacing with an empty list would strip every " +
          "tag from the contact — if that is the intent, list the current tags with " +
          "`contact-tag-list` and remove them with `contact-tag-remove`.",
      );
    }
    return new KajabiClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/relationships/tags`,
      { method: "PATCH", body: { data } },
    );
  },
};

export default contactTagReplace;
