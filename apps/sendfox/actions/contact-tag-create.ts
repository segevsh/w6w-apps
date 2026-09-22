import type { ActionDefinition } from "@w6w/types";
import { compact, SendfoxClient } from "../lib/client.ts";

/**
 * `POST /contact-tags` — create a contact tag.
 *
 * `name` is required and is **unique per account**; `color` is an optional
 * brand-palette hex value and is auto-assigned when omitted.
 *
 * Not idempotent: a retry of a create that actually succeeded does not return the
 * existing tag — SendFox answers `422` for the duplicate name.
 */
interface Input {
  name: string;
  color?: string;
}

const contactTagCreate: ActionDefinition<Input> = {
  key: "contact-tag-create",
  type: "perform",
  resource: "contact-tag",
  title: "Create Contact Tag",
  description: "Create a contact tag with an optional brand color.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Unique per account (max 191 chars) — a duplicate name is rejected with a 422.",
    },
    {
      key: "color",
      label: "Color",
      type: "string",
      placeholder: "#FF644D",
      hint: "Optional brand-palette hex color. SendFox auto-assigns one when omitted.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Tag id" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Color" },
    { key: "contacts_count", type: "number", label: "Contacts carrying this tag" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json("/contact-tags", {
      method: "POST",
      body: compact({ name: input.name, color: input.color }),
    });
  },
};

export default contactTagCreate;
