import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, PodiumClient, toList } from "../lib/client.ts";

interface Input {
  name: string;
  locations: string[] | string;
  email?: string;
  phoneNumber?: string;
  tags?: string[] | string;
  address?: unknown;
  attributes?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create or Update Contact",
  description:
    "Create a contact. If a contact with the same phone number, email or conversation uid already exists it is updated instead (upsert). Podium answers 202: the write is queued. Requires scope `write_contacts`.",
  idempotent: true,
  params: [{
    key: "name",
    label: "Name",
    type: "string",
    required: true,
  }, {
    key: "locations",
    label: "Location UIDs",
    type: "string",
    required: true,
    hint: "Comma-separated Podium location uids.",
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
    key: "tags",
    label: "Tag UIDs",
    type: "string",
    hint: "Comma-separated uids of existing contact tags.",
  }, {
    key: "address",
    label: "Address",
    type: "json",
    hint: "JSON object: addressLine1, addressLine2, city, state, postalCode, country.",
  }, {
    key: "attributes",
    label: "Attributes",
    type: "json",
    hint: 'JSON array of `{ "uid": "<attribute uid>", "value": \u2026 }`.',
  }],
  output: [{
    key: "identifier",
    type: "string",
    label: "Identifier of the contact that can be used to retrieve the contact",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one("/contacts", {
      method: "POST",
      body: compact({
        name: input.name,
        locations: toList(input.locations),
        email: input.email,
        phoneNumber: input.phoneNumber,
        tags: toList(input.tags),
        address: asOptionalJson(input.address, "Address"),
        attributes: asOptionalJson(input.attributes, "Attributes"),
      }),
    });
  },
};

export default contactCreate;
