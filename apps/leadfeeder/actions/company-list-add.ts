import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply, seg, strList } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  id: string;
  listIds: unknown;
}

/** `POST /v1/companies/c_1/lists` — verified against the vendor OpenAPI document (2026-10-06). */
const companyListAdd: ActionDefinition<Input> = {
  key: "company-list-add",
  type: "perform",
  resource: "company",
  idempotent: false,
  title: "Add Company To Lists",
  description: "Add a company to one or more company lists.",
  params: [
    accountIdParam,
    { key: "id", label: "Company ID", type: "string", required: true, hint: "The company id." },
    {
      key: "listIds",
      label: "List IDs",
      type: "json",
      required: true,
      hint: "Array or comma-separated ids of company lists.",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = `/v1/companies/${seg(input.id)}/lists`;
    const query = { account_id: input.accountId };
    const body = { data: (strList(input.listIds) ?? []).map((id) => ({ type: "list", id })) };
    return reply(await new LeadfeederClient(ctx).request("POST", path, { query, body }));
  },
};

export default companyListAdd;
