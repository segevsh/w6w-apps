import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { linkBody, linkParams } from "../lib/links.ts";

interface Input {
  tableId: string;
  otherTableId: string;
  linkId: string;
  otherRowsIdsMap: unknown;
}

const rowLinkCreate: ActionDefinition<Input> = {
  key: "row-link-create",
  type: "perform",
  resource: "link",
  title: "Create Row Links",
  description:
    "Create links between rows through a link column: the map says, for each row of the source table, which rows of the other table to link it to. Creating a link that already exists is an error, so this is not retry-safe.",
  idempotent: false,
  params: linkParams,
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new SeaTableClient(ctx).request("/links/", { method: "POST", body: linkBody(input) });
  },
};

export default rowLinkCreate;
