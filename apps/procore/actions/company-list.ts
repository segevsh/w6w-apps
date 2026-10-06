import type { ActionDefinition } from "@w6w/types";
import { type Page, pageOutput, pagingParams, ProcoreClient } from "../lib/client.ts";

interface Input {
  page?: number;
  perPage?: number;
  includeFreeCompanies?: boolean;
}

/** `GET /rest/v1.0/companies` — needs no `Procore-Company-Id` header. */
const companyList: ActionDefinition<Input> = {
  key: "company-list",
  type: "read",
  resource: "company",
  title: "List Companies",
  description:
    "List the Procore companies the signed-in user can access. Start here to find a company ID.",
  params: [
    ...pagingParams,
    {
      key: "includeFreeCompanies",
      label: "Include free companies",
      type: "boolean",
      hint: "Free companies are excluded by default.",
    },
  ],
  output: pageOutput,

  execute(input, ctx): Promise<Page> {
    return new ProcoreClient(ctx).list(
      "/rest/v1.0/companies",
      input,
      { include_free_companies: input.includeFreeCompanies },
      { noCompany: true },
    );
  },
};

export default companyList;
