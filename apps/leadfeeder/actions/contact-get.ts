import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply, seg } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  id: string;
  include?: string;
}

/** `GET /v1/contacts/p_1` — verified against the vendor OpenAPI document (2026-10-06). */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description:
    "Fetch one contact by id, optionally with its company, lists or buyer personas inlined.",
  params: [
    accountIdParam,
    {
      key: "id",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "The contact id, from Search Contacts.",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint:
        "Comma-separated: `company, lists, buyer_personas, crm_connections, crm_suggestions` (and dotted children).",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = `/v1/contacts/${seg(input.id)}`;
    const query = { account_id: input.accountId, include: input.include };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default contactGet;
