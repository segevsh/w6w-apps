import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, asJson, compact } from "../lib/client.ts";

/** `POST /contacts` — Anchor operation `createContact`. */
interface Input {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phone?: string;
  metadata?: unknown;
}

function parseJson(value: unknown, label: string): unknown {
  return asJson(value, label);
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a client contact. Uniqueness is per (email, company name): the same email under a different company creates a second contact.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "companyName", label: "Company name", type: "string", required: true },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: 'Flat JSON object with string values only, e.g. {"crm_id": "42"}.',
    },
  ],
  output: [
    { key: "contactId", type: "string", label: "ID of the new contact" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("POST", "/contacts", {
      body: compact({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        companyName: input.companyName,
        phone: input.phone,
        metadata: input.metadata === undefined || input.metadata === ""
          ? undefined
          : parseJson(input.metadata, "metadata"),
      }),
      wrap: "contactId",
    });
  },
};

export default contactCreate;
