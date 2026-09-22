import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam, modelObjectParam } from "../lib/params.ts";

/**
 * `PUT /contacts/{contact_id}` — update a contact's details and status.
 *
 * `active`, `companyId` and `notes` are read-only on the model, so a contact
 * cannot be moved between companies through this route.
 */
interface Input {
  contactId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  position?: string;
  contactStatus?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact's details and status.",
  idempotent: true,
  params: [
    idParam("contactId", "Contact ID"),
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone", type: "string" },
    { key: "position", label: "Position", type: "string" },
    modelObjectParam("contactStatus", "Status", '{ "id": 1, "name": "Active" }'),
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "contactStatus", type: "object", label: "Status — `{ id, name }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/contacts/${encodeId(input.contactId)}`, {
      method: "PUT",
      body: compact({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phoneNumber: input.phoneNumber,
        position: input.position,
        contactStatus: asOptionalJson(input.contactStatus, "contactStatus"),
      }),
    });
  },
};

export default contactUpdate;
