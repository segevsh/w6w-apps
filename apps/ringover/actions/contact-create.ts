import type { ActionDefinition } from "@w6w/types";
import { compact, contactNumbers, RingoverClient } from "../lib/client.ts";

interface Input {
  firstname: string;
  lastname?: string;
  company?: string;
  isShared?: boolean;
  numbers?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact in the key owner's address book, with optional phone numbers.",
  idempotent: false,
  params: [
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "lastname", label: "Last name", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "isShared", label: "Shared with the team", type: "boolean" },
    {
      key: "numbers",
      label: "Phone numbers",
      type: "json",
      hint:
        `[{"number":"33612345678","type":"mobile"}] — type is home, office, mobile, fax or other.`,
    },
  ],
  output: [
    { key: "contactIds", type: "array", label: "IDs of the created contacts" },
    { key: "contactId", type: "number", label: "ID of the created contact" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request<unknown>("POST", "/contacts", {
      body: {
        contacts: [compact({
          firstname: input.firstname,
          lastname: input.lastname,
          company: input.company,
          is_shared: input.isShared,
          numbers: contactNumbers(input.numbers),
        })],
      },
    });
    const ids = Array.isArray(body) ? body as number[] : [];
    return { contactIds: ids, contactId: ids[0] };
  },
};

export default contactCreate;
