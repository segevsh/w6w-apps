import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { linkBody, linkParams } from "../lib/links.ts";

interface Input {
  tableId: string;
  otherTableId: string;
  linkId: string;
  otherRowsIdsMap: unknown;
}

const rowLinkUpdate: ActionDefinition<Input> = {
  key: "row-link-update",
  type: "perform",
  resource: "link",
  title: "Update Row Links",
  description:
    "Replace links through a link column: existing links are removed and replaced with the mapping given.",
  idempotent: true,
  params: linkParams,
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/links/", { method: "PUT", body: linkBody(input) });
  },
};

export default rowLinkUpdate;
