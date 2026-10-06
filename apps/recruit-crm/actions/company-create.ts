import type { ActionDefinition } from "@w6w/types";
import { RecruitClient } from "../lib/client.ts";
import { companyFields } from "../lib/fields.ts";
import { fieldBody, fieldParams } from "../lib/params.ts";

const companyCreate: ActionDefinition<Record<string, unknown>> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description: "Create a company (`POST /v1/companies`, JSON body).",
  idempotent: false,
  params: fieldParams(companyFields),
  output: [
    { key: "company_name", type: "string", label: "Company name" },
    { key: "slug", type: "string", label: "Id (slug)" },
  ],

  execute(input, ctx) {
    const body = fieldBody(companyFields, input);
    if (Object.keys(body).length === 0) throw new Error("at least one company field is required");
    return new RecruitClient(ctx).json("/companies", { method: "POST", body });
  },
};

export default companyCreate;
