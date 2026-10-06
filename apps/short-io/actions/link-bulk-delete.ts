import type { ActionDefinition } from "@w6w/types";
import { ShortClient } from "../lib/client.ts";

interface Input {
  linkIds: string[];
}

/** DELETE /links/delete_bulk with `{link_ids}` in the body. Vendor limit: 1 request/second. */
const linkBulkDelete: ActionDefinition<Input, { success: boolean }> = {
  key: "link-bulk-delete",
  type: "perform",
  resource: "link",
  title: "Delete Links in Bulk",
  description: "Permanently delete several links by id in one call.",
  idempotent: true,
  params: [
    {
      key: "linkIds",
      label: "Link IDs",
      type: "array",
      item: { type: "string" },
      required: true,
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const res = await new ShortClient(ctx).request<{ success?: boolean; error?: string }>(
      "/links/delete_bulk",
      { method: "DELETE", body: { link_ids: input.linkIds } },
    );
    if (res?.success === false) {
      throw new Error(`Short.io bulk delete failed: ${res.error ?? "unknown error"}`);
    }
    return { success: true };
  },
};

export default linkBulkDelete;
