import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, V2 } from "../lib/client.ts";
import { clientOrderOptions, directionParam, listOutput } from "../lib/params.ts";

interface Input {
  direction?: string;
  order?: string;
}

/**
 * `GET /api/v2/clients` — list client folders.
 *
 * The List-the-client-folders table in noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) documents two optional
 * parameters: `direction` (default `asc`) and `order` (default `name`, "The
 * value should be `name` or `id`").
 *
 * Note the shared `directionParam` helper's default is chosen per endpoint
 * from the vendor's own table, and here it is `asc` — unlike the lead list's
 * `desc`.
 */
const clientFolderGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "client-folder-get-many",
  type: "search",
  resource: "client-folder",
  title: "List Client Folders",
  description: "List the account's client folders, ordered by name or id (GET /api/v2/clients).",
  params: [
    directionParam("asc"),
    {
      key: "order",
      label: "Sort by",
      type: "select",
      default: "name",
      options: clientOrderOptions,
      hint: "Order by name or id. The document's default is `name`.",
    },
  ],
  output: listOutput("Client folders"),

  execute(input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/clients`, {
      query: { direction: input.direction, order: input.order },
    });
  },
};

export default clientFolderGetMany;
