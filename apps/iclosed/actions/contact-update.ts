import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `PUT /v1/contacts` — Update a contact's name, email, phone, status or referrer.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  secondary_email?: string;
  phoneNumber?: string;
  secondary_phoneNumber?: string;
  status?: string;
  referrerUrl?: string;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update contact",
  description: "Update a contact's name, email, phone, status or referrer.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Contact ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
    },
    {
      key: "secondary_email",
      label: "Secondary email",
      type: "string",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint: "E.164 format.",
    },
    {
      key: "secondary_phoneNumber",
      label: "Secondary phone number",
      type: "string",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "POTENTIAL", label: "Potential" }, {
        value: "QUALIFIED",
        label: "Qualified",
      }, { value: "DISQUALIFIED", label: "Disqualified" }],
    },
    {
      key: "referrerUrl",
      label: "Referrer URL",
      type: "string",
    },
  ],
  output: [
    { key: "data", type: "object", label: "{contact}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/contacts", {
      method: "PUT",
      body: compact({
        id: input.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        secondary_email: input.secondary_email,
        phoneNumber: input.phoneNumber,
        secondary_phoneNumber: input.secondary_phoneNumber,
        status: input.status,
        referrerUrl: input.referrerUrl,
      }),
    });
  },
};

export default contactUpdate;
