import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply, seg } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  id: string;
}

/** `DELETE /v1/lists/l1` — verified against the vendor OpenAPI document (2026-10-06). */
const listDelete: ActionDefinition<Input> = {
  key: "list-delete",
  type: "perform",
  resource: "list",
  idempotent: false,
  title: "Delete List",
  description: "Delete a list by id. Irreversible.",
  params: [
    accountIdParam,
    { key: "id", label: "List ID", type: "string", required: true, hint: "The list id to delete." },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = `/v1/lists/${seg(input.id)}`;
    const query = { account_id: input.accountId };
    return reply(await new LeadfeederClient(ctx).request("DELETE", path, { query }));
  },
};

export default listDelete;
