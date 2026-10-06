import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  identifier: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description:
    "Get one contact by conversation uid, phone number or email. Requires scope `read_contacts`.",
  params: [{
    key: "identifier",
    label: "Identifier",
    type: "string",
    required: true,
    hint: "Conversation uid, E.164 phone number (e.g. +15555550123) or email address.",
  }],
  output: [{
    key: "address",
    type: "object",
    label: "The address of the contact",
  }, {
    key: "attributes",
    type: "array",
    label: "attributes",
  }, {
    key: "channels",
    type: "array",
    label: "List of channels for the contact",
  }, {
    key: "conversations",
    type: "array",
    label: "conversations",
  }, {
    key: "createdAt",
    type: "string",
    label: "Time at which the resource was created. Date time is in Coordinated Un",
  }, {
    key: "emails",
    type: "array",
    label: "List of the contacts email addresses",
  }, {
    key: "locations",
    type: "array",
    label: "locations",
  }, {
    key: "name",
    type: "string",
    label: "The name of the contact resource",
  }, {
    key: "organization",
    type: "object",
    label: "Reference to the organization resource",
  }, {
    key: "phoneNumbers",
    type: "array",
    label: "List of the contacts phone numbers",
  }, {
    key: "tags",
    type: "array",
    label: "tags",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for contact",
  }, {
    key: "updatedAt",
    type: "string",
    label: "Time at which the resource was updated. Date time is in Coordinated Un",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/contacts/${encodeId(input.identifier)}`);
  },
};

export default contactGet;
