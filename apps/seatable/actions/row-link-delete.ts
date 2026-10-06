import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { linkBody, linkParams } from "../lib/links.ts";

interface Input {
  tableId: string;
  otherTableId: string;
  linkId: string;
  otherRowsIdsMap: unknown;
}

const rowLinkDelete: ActionDefinition<Input> = {
  key: "row-link-delete",
  type: "perform",
  resource: "link",
  title: "Delete Row Links",
  description: "Delete the links named in the mapping. Other links are left untouched.",
  idempotent: true,
  params: linkParams,
  output: [{ key: "deleted_links_count", type: "number", label: "Links removed" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/links/", { method: "DELETE", body: linkBody(input) });
  },
};

export default rowLinkDelete;
