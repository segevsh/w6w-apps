import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `DELETE /tags/contact/{contact}/{tag}` (scope `tags:write`). Answers `{type, message}`.
 */
interface Input {
  contact: number;
  tag: number;
}

const contactTagRemove: ActionDefinition<Input> = {
  key: "contact-tag-remove",
  type: "perform",
  resource: "tag",
  title: "Remove Tag from Contact",
  description: "Detach a tag from a contact.",
  idempotent: true,
  params: [
    {
      key: "contact",
      label: "Contact ID",
      type: "number",
      required: true,
      hint: "The contact ID.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "tag",
      label: "Tag ID",
      type: "number",
      required: true,
      hint: "The tag ID.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "response", type: "object", label: "The vendor's `{type, message}` answer" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(
      `/tags/contact/${encodePathSegment(input.contact)}/${encodePathSegment(input.tag)}`,
      {
        method: "DELETE",
      },
    );
  },
};

export default contactTagRemove;
