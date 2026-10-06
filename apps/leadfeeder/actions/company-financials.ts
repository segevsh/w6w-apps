import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply, seg } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  id: string;
}

/** `GET /v1/companies/c_1/financials` — verified against the vendor OpenAPI document (2026-10-06). */
const companyFinancials: ActionDefinition<Input> = {
  key: "company-financials",
  type: "read",
  resource: "company",
  title: "Get Company Financials",
  description: "Fetch the financial reports for a company. Consumes credits.",
  params: [
    accountIdParam,
    { key: "id", label: "Company ID", type: "string", required: true, hint: "The company id." },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = `/v1/companies/${seg(input.id)}/financials`;
    const query = { account_id: input.accountId };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default companyFinancials;
