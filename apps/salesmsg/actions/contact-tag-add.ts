import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `PUT /tags/contact/{contact}/{tag}` (scope `tags:write`). Answers `{type, message}`.
 */
interface Input {
  contact: number;
  tag: number;
}

const contactTagAdd: ActionDefinition<Input> = {
  key: "contact-tag-add",
  type: "perform",
  resource: "tag",
  title: "Add Tag to Contact",
  description: "Attach an existing tag to a contact.",
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
      hint: "The tag ID, from List Tags.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "response", type: "object", label: "The vendor's `{type, message}` answer" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(
      `/tags/contact/${encodePathSegment(input.contact)}/${encodePathSegment(input.tag)}`,
      {
        method: "PUT",
      },
    );
  },
};

export default contactTagAdd;
