import type { ActionDefinition } from "@w6w/types";
import { bit, buildBody, ref, UpsalesClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /api/v2/contacts` — Create a contact.
 *
 * Create sends `usingFirstnameLastname=true`, as the vendor's own example does, so
 * `firstName`/`lastName` are accepted. The vendor's update example sends the combined `name`.
 */
interface Input {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  cellPhone?: string;
  title?: string;
  active?: boolean;
  clientId: number;
  fields?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact.",
  idempotent: false,
  params: [
    {
      "key": "firstName",
      "label": "First name",
      "type": "string",
      "required": true,
    },
    {
      "key": "lastName",
      "label": "Last name",
      "type": "string",
    },
    {
      "key": "email",
      "label": "Email",
      "type": "string",
    },
    {
      "key": "phone",
      "label": "Phone",
      "type": "string",
    },
    {
      "key": "cellPhone",
      "label": "Mobile phone",
      "type": "string",
    },
    {
      "key": "title",
      "label": "Job title",
      "type": "string",
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean",
    },
    {
      "key": "clientId",
      "label": "Company ID",
      "type": "number",
      "required": true,
      "hint": "The company (client) the contact belongs to.",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The created contact" }],

  async execute(input, ctx) {
    const body = buildBody(input.fields, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      cellPhone: input.cellPhone,
      title: input.title,
      active: bit(input.active),
      client: ref(input.clientId),
    });
    const data = await new UpsalesClient(ctx).data("POST", "/contacts", {
      body,
      query: { "usingFirstnameLastname": "true" },
    });
    return { data };
  },
};

export default contactCreate;
