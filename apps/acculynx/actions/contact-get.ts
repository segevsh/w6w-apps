import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam, includesParam } from "../lib/params.ts";

interface Input {
  contactId: string;
  includes?: string;
}

const action: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Get one contact by id.",
  params: [
    idParam("contactId", "Contact id"),
    includesParam("emailAddress, phoneNumber"),
  ],
  output: [
    { key: "id", type: "string", label: "Contact id" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "companyName", type: "string", label: "Company name" },
    { key: "phoneNumbers", type: "array", label: "Phone number links" },
    { key: "emailAddresses", type: "array", label: "Email address links" },
    { key: "mailingAddress", type: "object", label: "Mailing address" },
    { key: "billingAddress", type: "object", label: "Billing address" },
    { key: "createdDate", type: "string", label: "Created (ISO 8601)" },
    { key: "modifiedDate", type: "string", label: "Modified (ISO 8601)" },
  ],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(`/contacts/${encodeId(input.contactId)}`, {
      includes: input.includes,
    });
  },
};

export default action;
