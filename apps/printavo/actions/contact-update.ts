import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PrintavoClient } from "../lib/client.ts";
import { CONTACT_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fax?: string;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact (contactUpdate); only the fields you set are sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "email", label: "Email(s)", type: "string", hint: "Comma-separated." },
    { key: "phone", label: "Phone", type: "string" },
    { key: "fax", label: "Fax", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "fullName", type: "string", label: "Full Name" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ contactUpdate: unknown }>(
      `mutation($id: ID!, $input: ContactInput!) { contactUpdate(id: $id, input: $input) { ${CONTACT_FIELDS} } }`,
      {
        id: input.id,
        input: compact({
          firstName: input.firstName,
          lastName: input.lastName,
          email: csv(input.email),
          phone: input.phone,
          fax: input.fax,
        }),
      },
    );
    return data.contactUpdate;
  },
};

export default contactUpdate;
