import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply, seg } from "../lib/client.ts";
import {
  accountIdParam,
  cursorParam,
  dataOutput,
  metaOutput,
  nextCursorOutput,
  pageSizeParam,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  id: string;
  cursor?: string;
  pageSize?: number;
}

/** `GET /v1/lists/l1/items` — verified against the vendor OpenAPI document (2026-10-06). */
const listItems: ActionDefinition<Input> = {
  key: "list-items",
  type: "search",
  resource: "list",
  title: "List Items In List",
  description:
    "Page through the companies or contacts in a list (ids and types only; fetch details with Get Company / Get Contact).",
  params: [
    accountIdParam,
    { key: "id", label: "List ID", type: "string", required: true, hint: "The list id." },
    cursorParam,
    pageSizeParam,
  ],
  output: [
    dataOutput,
    metaOutput,
    nextCursorOutput,
  ],

  async execute(input, ctx) {
    const path = `/v1/lists/${seg(input.id)}/items`;
    const query = {
      account_id: input.accountId,
      "page[cursor]": input.cursor,
      "page[size]": input.pageSize,
    };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default listItems;
