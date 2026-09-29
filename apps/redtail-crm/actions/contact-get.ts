import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";
import type { RedtailContact } from "../lib/types.ts";

interface Input {
  contactId: number;
  include?: string;
}

interface Output {
  contact: RedtailContact;
}

const contactGet: ActionDefinition<Input, Output> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Get a single contact by id.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    {
      key: "include",
      label: "Include",
      type: "string",
      advanced: true,
      hint: "Comma-separated dependent records to attach, e.g. addresses,phones,emails,urls. " +
        "Sent as a request header, per the docs.",
    },
  ],
  output: [
    { key: "contact.id", type: "number", label: "Contact ID" },
    { key: "contact.full_name", type: "string", label: "Full name" },
    { key: "contact.type", type: "string", label: "Type" },
    { key: "contact.status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>(`/contacts/${input.contactId}`, {
      headers: { include: input.include },
    });
    return res.data;
  },
};

export default contactGet;
