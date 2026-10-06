import type { ActionDefinition } from "@w6w/types";
import { encodeId, RecruitClient } from "../lib/client.ts";
import { slugParam } from "../lib/params.ts";

interface Input {
  companyId: string;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch one company by id (`GET /v1/companies/{id}`).",
  params: [slugParam("companyId", "Company id", "company")],
  output: [{ key: "company_name", type: "string", label: "Company name" }, {
    key: "website",
    type: "string",
    label: "Website",
  }],

  execute(input, ctx) {
    return new RecruitClient(ctx).json(`/companies/${encodeId(input.companyId)}`);
  },
};

export default companyGet;
