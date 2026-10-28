import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";

/**
 * `DELETE /wiki/api/v2/pages/{id}` — verified against Confluence Cloud's REST
 * API v2 OpenAPI document (`deletePage`). Confluence answers 204 with no body.
 *
 * By default this moves the page to the trash, which is recoverable. `purge`
 * empties it from the trash permanently, and Confluence only accepts that for
 * a page that is already trashed.
 */
const action: ActionDefinition = {
  key: "page-delete",
  type: "perform",
  resource: "page",
  title: "Delete a page",
  description: "Move a page to the trash, or purge one already in the trash.",
  idempotent: true,
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true, default: "" },
    {
      key: "purge",
      label: "Purge",
      type: "boolean",
      default: false,
      hint: "Permanently remove a page that is already in the trash. Not recoverable.",
    },
    {
      key: "draft",
      label: "Draft",
      type: "boolean",
      default: false,
      hint: "Set when deleting a draft page.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "purged", type: "boolean", label: "Purged" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pageId = String(p.pageId ?? "").trim();
    if (!pageId) throw new Error("`pageId` is required");

    const client = new ConfluenceClient(ctx);
    const purge = p.purge === true;
    ctx.log("info", "deleting Confluence page", { pageId, purge });

    await client.request(`/pages/${encodeURIComponent(pageId)}`, {
      method: "DELETE",
      query: {
        purge: purge ? "true" : undefined,
        draft: p.draft === true ? "true" : undefined,
      },
    });
    return { id: pageId, deleted: true, purged: purge };
  },
};

export default action;
