import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply, seg } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  id: string;
  include?: string;
}

/** `GET /v1/companies/c_1` — verified against the vendor OpenAPI document (2026-10-06). */
const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description:
    "Fetch one company by id, optionally with tags, lists, web visits, ICP matches or CRM links inlined.",
  params: [
    accountIdParam,
    {
      key: "id",
      label: "Company ID",
      type: "string",
      required: true,
      hint: "The company id, from Search Companies, Match Companies or a web-visit relationship.",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint:
        "Comma-separated related resources: `group_company, tags, lists, web_visits, icps, crm_connections, crm_suggestions, crm_group_connections` (and dotted children such as `crm_connections.crm_record`).",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = `/v1/companies/${seg(input.id)}`;
    const query = { account_id: input.accountId, include: input.include };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default companyGet;
