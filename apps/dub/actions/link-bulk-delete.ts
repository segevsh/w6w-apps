import type { ActionDefinition } from "@w6w/types";
import { DubClient, strList } from "../lib/client.ts";

interface Input {
  linkIds: string[] | string;
}

/** `DELETE /links/bulk?linkIds=a,b,c` — up to 100; unknown IDs are ignored. */
const linkBulkDelete: ActionDefinition<Input> = {
  key: "link-bulk-delete",
  type: "perform",
  resource: "link",
  title: "Bulk Delete Links",
  description:
    "Permanently delete up to 100 links by ID. IDs that do not exist are ignored, and the count of links actually removed is returned.",
  idempotent: true,
  params: [
    {
      key: "linkIds",
      label: "Link IDs",
      type: "array",
      required: true,
      item: { type: "string" },
      hint: "Maximum 100.",
    },
  ],
  output: [{ key: "deletedCount", type: "number", label: "Links deleted" }],

  execute(input, ctx) {
    const ids = strList(input.linkIds);
    if (!ids) throw new Error("Give at least one link ID.");
    if (ids.length > 100) throw new Error("Dub accepts at most 100 link IDs per bulk delete.");
    return new DubClient(ctx).request("DELETE", "/links/bulk", { query: { linkIds: ids } });
  },
};

export default linkBulkDelete;
