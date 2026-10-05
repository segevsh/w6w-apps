import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `POST /contacts` (scope `contacts:write`). The document declares every field as a **query
 * parameter** and no request body, so that is where they go. No idempotency key is declared; a
 * retry may be refused as a duplicate or may create a second record, so the action is `idempotent:
 * false`.
 */
interface Input {
  number: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_type?: string;
  source?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact from a phone number.",
  idempotent: false,
  params: [
    {
      key: "number",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "The contact's number, ideally in E.164 form (+15551234567).",
    },
    {
      key: "first_name",
      label: "First name",
      type: "string",
    },
    {
      key: "last_name",
      label: "Last name",
      type: "string",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
    },
    {
      key: "phone_type",
      label: "Phone type",
      type: "string",
      hint: "Phone type, for example `phone`.",
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      hint: "Free-text origin of the contact.",
    },
  ],
  output: [{ key: "response", type: "object", label: "The created contact" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json("/contacts", {
      method: "POST",
      query: {
        number: input.number,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone_type: input.phone_type,
        source: input.source,
      },
    });
  },
};

export default contactCreate;
