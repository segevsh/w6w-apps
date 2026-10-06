import type { ActionDefinition } from "@w6w/types";
import { compact, contactNumbers, RingoverClient, seg } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

interface Input {
  contactId: number;
  firstname: string;
  lastname: string;
  company: string;
  isShared: boolean;
  numbers?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact. Ringover requires first name, last name, company and the shared flag on every update; phone numbers, if given, REPLACE the existing ones.",
  idempotent: true,
  params: [
    contactIdParam,
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "lastname", label: "Last name", type: "string", required: true },
    { key: "company", label: "Company", type: "string", required: true },
    { key: "isShared", label: "Shared with the team", type: "boolean", required: true },
    {
      key: "numbers",
      label: "Replace phone numbers",
      type: "json",
      hint:
        `Omit to leave numbers unchanged. [{"number":"33612345678","type":"mobile"}] — type is home, office, mobile, fax or other.`,
    },
  ],
  output: [
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "company", type: "string", label: "Company" },
    { key: "is_shared", type: "boolean", label: "Shared" },
    { key: "numbers", type: "array", label: "Phone numbers" },
  ],

  execute(input, ctx) {
    return new RingoverClient(ctx).request("PUT", `/contacts/${seg(input.contactId)}`, {
      body: compact({
        firstname: input.firstname,
        lastname: input.lastname,
        company: input.company,
        is_shared: input.isShared,
        numbers: contactNumbers(input.numbers),
      }),
    });
  },
};

export default contactUpdate;
