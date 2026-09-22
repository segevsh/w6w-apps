import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, idParam, modelObjectParam } from "../lib/params.ts";

/**
 * `PUT /companies/{company_id}` — update a company.
 *
 * The body is the same `Company` model as create, so the same writable subset
 * applies: `branchId`, `rateCardId`, `companyLeadUserId` and `notes` are
 * read-only and cannot be changed through the API at all, from this app or any
 * other.
 */
interface Input {
  companyId: number;
  name?: string;
  companyStatus?: unknown;
  taxNumber?: string;
  phone1?: string;
  phone2?: string;
  websiteAddress?: string;
}

const companyUpdate: ActionDefinition<Input> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description: "Update a company's name, status, tax number, phones or website.",
  // A PUT of the same fields is safe to repeat.
  idempotent: true,
  params: [
    idParam("companyId", "Company ID"),
    { key: "name", label: "Name", type: "string" },
    modelObjectParam("companyStatus", "Status", '{ "id": 1, "name": "Active" }'),
    { key: "taxNumber", label: "Tax Number", type: "string" },
    { key: "phone1", label: "Primary Phone", type: "string" },
    { key: "phone2", label: "Secondary Phone", type: "string" },
    { key: "websiteAddress", label: "Website", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "name", type: "string", label: "Company name" },
    { key: "companyStatus", type: "object", label: "Status — `{ id, name }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/companies/${encodeId(input.companyId)}`, {
      method: "PUT",
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

export default companyUpdate;
