import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, EzTextingClient } from "../lib/client.ts";

/** `POST /v1/contact-groups` — create a group (name max 25 chars), optionally seeded. Answers `{id}`. */
interface Input {
  name: string;
  note?: string;
  phoneNumbers?: string[] | string;
  groupIds?: string[] | string;
  strictValidation?: boolean;
}

const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Contact Group",
  description: "Create a contact group, optionally seeded with numbers or other groups.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: 25 },
    },
    { key: "note", label: "Note", type: "text", validation: { maxLength: 500 } },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "array",
      item: { type: "string" },
      hint: "Contacts to add to the new group.",
    },
    {
      key: "groupIds",
      label: "Merge group IDs",
      type: "array",
      item: { type: "string" },
      hint: "Existing groups whose contacts are merged into this one.",
      advanced: true,
    },
    {
      key: "strictValidation",
      label: "Strict validation",
      type: "boolean",
      hint: "If true, the group is not created when any phone number is invalid.",
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Group ID" }],

  async execute(input, ctx) {
    const result = await new EzTextingClient(ctx).json<{ id?: string }>("/contact-groups", {
      method: "POST",
      body: compact({
        name: input.name,
        note: input.note,
        phoneNumbers: asStringArray(input.phoneNumbers),
        groupIds: asStringArray(input.groupIds),
        strictValidation: input.strictValidation,
      }),
    });
    return { id: result?.id };
  },
};

export default groupCreate;
