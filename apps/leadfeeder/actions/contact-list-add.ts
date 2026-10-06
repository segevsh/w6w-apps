import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply, seg, strList } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  id: string;
  listIds: unknown;
}

/** `POST /v1/contacts/p_1/lists` — verified against the vendor OpenAPI document (2026-10-06). */
const contactListAdd: ActionDefinition<Input> = {
  key: "contact-list-add",
  type: "perform",
  resource: "contact",
  idempotent: false,
  title: "Add Contact To Lists",
  description: "Add a contact to one or more contact lists.",
  params: [
    accountIdParam,
    { key: "id", label: "Contact ID", type: "string", required: true, hint: "The contact id." },
    {
      key: "listIds",
      label: "List IDs",
      type: "json",
      required: true,
      hint: "Array or comma-separated ids of contact lists.",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = `/v1/contacts/${seg(input.id)}/lists`;
    const query = { account_id: input.accountId };
    const body = { data: (strList(input.listIds) ?? []).map((id) => ({ type: "list", id })) };
    return reply(await new LeadfeederClient(ctx).request("POST", path, { query, body }));
  },
};

export default contactListAdd;
