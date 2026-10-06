import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, PodiumClient, toList } from "../lib/client.ts";

interface Input {
  identifier: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  locations?: string[] | string;
  conversationUid?: string;
  address?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact identified by conversation uid, phone number or email. Only the fields you set are sent. Requires scope `write_contacts`.",
  idempotent: true,
  params: [{
    key: "identifier",
    label: "Identifier",
    type: "string",
    required: true,
    hint: "Conversation uid, E.164 phone number (e.g. +15555550123) or email address.",
  }, {
    key: "name",
    label: "Name",
    type: "string",
  }, {
    key: "email",
    label: "Email",
    type: "string",
  }, {
    key: "phoneNumber",
    label: "Phone number",
    type: "string",
    hint: "E.164, e.g. +15555550123.",
  }, {
    key: "locations",
    label: "Location UIDs",
    type: "string",
    hint: "Comma-separated Podium location uids.",
  }, {
    key: "conversationUid",
    label: "Conversation UID",
    type: "string",
  }, {
    key: "address",
    label: "Address",
    type: "json",
    hint: "JSON object: addressLine1, addressLine2, city, state, postalCode, country.",
  }],
  output: [{
    key: "identifier",
    type: "string",
    label: "Identifier of the contact that can be used to retrieve the contact",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/contacts/${encodeId(input.identifier)}`, {
      method: "PATCH",
      body: compact({
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber,
        locations: toList(input.locations),
        conversationUid: input.conversationUid,
        address: asOptionalJson(input.address, "Address"),
      }),
    });
  },
};

export default contactUpdate;
