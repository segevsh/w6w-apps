import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  identifier: string;
  uid: string;
}

const contactTagAdd: ActionDefinition<Input> = {
  key: "contact-tag-add",
  type: "perform",
  resource: "contact",
  title: "Add Tag to Contact",
  description: "Add an existing tag to an existing contact. Requires scope `write_contacts`.",
  idempotent: true,
  params: [{
    key: "identifier",
    label: "Contact identifier",
    type: "string",
    required: true,
    hint: "Conversation uid, E.164 phone number (e.g. +15555550123) or email address.",
  }, {
    key: "uid",
    label: "Tag UID",
    type: "string",
    required: true,
    hint: "From List Contact Tags.",
  }],
  output: [{
    key: "identifier",
    type: "string",
    label: "Identifier of the contact that can be used to retrieve the contact",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(
      `/contacts/${encodeId(input.identifier)}/tags/${encodeId(input.uid)}`,
      {
        method: "POST",
      },
    );
  },
};

export default contactTagAdd;
