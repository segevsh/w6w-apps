import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  contact_id: string;
  tags: string[];
}

/**
 * `PUT /v2/public/contact/{contact_id}/tags` — associate hashtags with a
 * contact. The vendor's schema takes `{tags: [{name, locked}]}`; `locked`
 * (admin-only removal) defaults to unlocked here, since this app has no way
 * to distinguish admin- from agent-scoped tokens and an unlocked tag is the
 * safer default — it can always be locked later from kvCORE itself.
 */
const contactTagsAdd: ActionDefinition<Input> = {
  key: "contact-tags-add",
  type: "perform",
  resource: "contact",
  title: "Add Tags to Contact",
  description: "Add one or more hashtags to a contact. Existing tags are left untouched.",
  idempotent: true,
  params: [
    { key: "contact_id", label: "Contact ID", type: "string", required: true },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      required: true,
      hint: "Tag names, without the leading #.",
    },
  ],
  output: [
    { key: "contact_id", type: "number", label: "Contact ID" },
    { key: "tags", type: "array", label: "The contact's tags after this call" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(
      `/contact/${encodeURIComponent(input.contact_id)}/tags`,
      {
        method: "PUT",
        body: { tags: input.tags.map((name) => ({ name, locked: 0 })) },
      },
    );
  },
};

export default contactTagsAdd;
