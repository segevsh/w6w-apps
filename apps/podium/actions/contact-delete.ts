import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  identifier: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description:
    "Delete a contact identified by conversation uid, phone number or email. Requires scope `write_contacts`.",
  idempotent: true,
  params: [{
    key: "identifier",
    label: "Identifier",
    type: "string",
    required: true,
    hint: "Conversation uid, E.164 phone number (e.g. +15555550123) or email address.",
  }],
  output: [{
    key: "identifier",
    type: "string",
    label: "Identifier of the contact that can be used to retrieve the contact",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/contacts/${encodeId(input.identifier)}`, {
      method: "DELETE",
    });
  },
};

export default contactDelete;
