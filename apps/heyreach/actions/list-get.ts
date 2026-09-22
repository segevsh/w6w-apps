import type { ActionDefinition } from "@w6w/types";
import { HeyReachClient } from "../lib/client.ts";
import { listIdParam } from "../lib/params.ts";

interface Input {
  listId: number;
}

/**
 * `GET /api/public/list/GetById?listId=…` — one lead or company list.
 *
 * `listId` is a **query parameter**; the same id is a body field on the
 * list-membership endpoints. The response carries `totalItemsCount` (how many
 * leads the list holds) and `campaignIds` (which campaigns draw from it), which
 * together answer "is this list already feeding a campaign".
 *
 * The document types `totalItemsCount` as a `string` and `listType` as an
 * untyped `oneOf` — generator artifacts; the fields are declared here as they
 * are documented, so `totalItemsCount` is deliberately left out of the static
 * output rather than typed wrongly. The full object is returned either way.
 */
const action: ActionDefinition<Input> = {
  key: "list-get",
  type: "read",
  resource: "list",
  title: "Get List",
  description:
    "Fetch one lead or company list by id, with its lead count and the campaigns that use it " +
    "(GET /api/public/list/GetById).",
  params: [listIdParam],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "List name" },
    { key: "creationTime", type: "string", label: "Created at" },
    { key: "campaignIds", type: "array", label: "Campaigns using this list" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/list/GetById", {
      query: { listId: input.listId },
    });
  },
};

export default action;
