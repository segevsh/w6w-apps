import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply, seg } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  id: string;
}

/** `GET /v1/lists/l1` — verified against the vendor OpenAPI document (2026-10-06). */
const listGet: ActionDefinition<Input> = {
  key: "list-get",
  type: "read",
  resource: "list",
  title: "Get List",
  description: "Fetch one list by id.",
  params: [
    accountIdParam,
    {
      key: "id",
      label: "List ID",
      type: "string",
      required: true,
      hint: "The list id, from List Lists.",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = `/v1/lists/${seg(input.id)}`;
    const query = { account_id: input.accountId };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default listGet;
