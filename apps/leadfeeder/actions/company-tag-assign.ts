import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply, seg, strList } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  id: string;
  tagIds: unknown;
}

/** `POST /v1/companies/c_1/tags` — verified against the vendor OpenAPI document (2026-10-06). */
const companyTagAssign: ActionDefinition<Input> = {
  key: "company-tag-assign",
  type: "perform",
  resource: "company",
  idempotent: false,
  title: "Assign Tags To Company",
  description: "Assign one or more tags to a company.",
  params: [
    accountIdParam,
    { key: "id", label: "Company ID", type: "string", required: true, hint: "The company id." },
    {
      key: "tagIds",
      label: "Tag IDs",
      type: "json",
      required: true,
      hint: "Array or comma-separated tag ids from List Tags.",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = `/v1/companies/${seg(input.id)}/tags`;
    const query = { account_id: input.accountId };
    const body = { data: (strList(input.tagIds) ?? []).map((id) => ({ type: "tag", id })) };
    return reply(await new LeadfeederClient(ctx).request("POST", path, { query, body }));
  },
};

export default companyTagAssign;
