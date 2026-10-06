import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PrintavoClient } from "../lib/client.ts";
import { CONTACT_FIELDS } from "../lib/fields.ts";

interface Input {
  customerId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fax?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Add a contact to an existing customer (contactCreate; the `id` argument is the customer's ID).",
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
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
    const data = await client.query<{ contactCreate: unknown }>(
      `mutation($id: ID!, $input: ContactInput!) { contactCreate(id: $id, input: $input) { ${CONTACT_FIELDS} } }`,
      {
        id: input.customerId,
        input: compact({
          firstName: input.firstName,
          lastName: input.lastName,
          email: csv(input.email),
          phone: input.phone,
          fax: input.fax,
        }),
      },
    );
    return data.contactCreate;
  },
};

export default contactCreate;
