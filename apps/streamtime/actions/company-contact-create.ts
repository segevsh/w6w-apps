import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam, modelObjectParam } from "../lib/params.ts";

/**
 * `POST /companies/{company_id}/contacts` — add a contact to a company.
 *
 * The company id is in the path **and** read-only on the `Contact` model, so the
 * association cannot drift: the body never carries a `companyId`.
 */
interface Input {
  companyId: number;
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  position?: string;
  contactStatus?: unknown;
}

const companyContactCreate: ActionDefinition<Input> = {
  key: "company-contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Company Contact",
  description: "Create a contact against a company.",
  idempotent: false,
  params: [
    idParam("companyId", "Company ID", "The company this contact belongs to."),
    { key: "firstName", label: "First Name", type: "string", required: true },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "email", label: "Email", type: "string", placeholder: "jane.doe@example.com" },
    { key: "phoneNumber", label: "Phone", type: "string" },
    { key: "position", label: "Position", type: "string" },
    modelObjectParam("contactStatus", "Status", '{ "id": 1, "name": "Active" }'),
  ],
  output: [
    { key: "id", type: "number", label: "New contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "companyId", type: "number", label: "Company the contact belongs to" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(
      `/companies/${encodeId(input.companyId)}/contacts`,
      {
        method: "POST",
        body: compact({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phoneNumber: input.phoneNumber,
          position: input.position,
          contactStatus: asOptionalJson(input.contactStatus, "contactStatus"),
        }),
      },
    );
  },
};

export default companyContactCreate;
