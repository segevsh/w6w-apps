import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";
import { phoneNumberParam } from "../lib/params.ts";

/** `GET /v1/contacts/{phoneNumber}` — a contact, with its groups and opt-out flag. */
interface Input {
  phoneNumber: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Get one contact by phone number.",
  params: [phoneNumberParam],
  output: [
    { key: "phoneNumber", type: "string", label: "Phone number" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "note", type: "string", label: "Note" },
    { key: "optOut", type: "boolean", label: "Opted out" },
    { key: "groups", type: "array", label: "Groups" },
    { key: "values", type: "object", label: "Custom field values" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    return (await new EzTextingClient(ctx).json(
      `/contacts/${encodePathSegment(input.phoneNumber)}`,
    )) ?? {};
  },
};

export default contactGet;
