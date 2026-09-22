import type { ActionDefinition } from "@w6w/types";
import { compact, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, modelObjectParam } from "../lib/params.ts";

/**
 * `POST /companies` — create a company.
 *
 * Only the fields the `Company` schema marks writable are exposed. The document
 * marks `branchId`, `rateCardId`, `companyLeadUserId` and `notes` read-only, so
 * there is no param for them — see the README's "Strictly writable" note.
 */
interface Input {
  name: string;
  companyStatus?: unknown;
  taxNumber?: string;
  phone1?: string;
  phone2?: string;
  websiteAddress?: string;
}

const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description: "Create a company in the authenticated organisation.",
  // The API documents no idempotency key; a retry can create a second company.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Acme Corporation" },
    modelObjectParam("companyStatus", "Status", '{ "id": 1, "name": "Active" }'),
    { key: "taxNumber", label: "Tax Number", type: "string" },
    { key: "phone1", label: "Primary Phone", type: "string" },
    { key: "phone2", label: "Secondary Phone", type: "string" },
    { key: "websiteAddress", label: "Website", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "New company ID" },
    { key: "name", type: "string", label: "Company name" },
    { key: "branchName", type: "string", label: "Branch it was created in" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request("/companies", {
      method: "POST",
      body: compact({
        name: input.name,
        companyStatus: asOptionalJson(input.companyStatus, "companyStatus"),
        taxNumber: input.taxNumber,
        phone1: input.phone1,
        phone2: input.phone2,
        websiteAddress: input.websiteAddress,
      }),
    });
  },
};

export default companyCreate;
