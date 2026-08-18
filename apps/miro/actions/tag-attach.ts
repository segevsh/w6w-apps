import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { BOARD_PARAM } from "../lib/params.ts";

/**
 * `POST /v2/boards/{board_id}/items/{item_id}?tag_id=…` — verified against
 * Miro's OpenAPI document (`attach-tag-to-item`), listed under the renamed path
 * parameter `{board_id_PlatformTags}`.
 *
 * Two things a reader would get wrong from the path alone: the tag is a
 * **query** parameter rather than part of the path, and there is **no body**.
 * Miro answers 204.
 */
const action: ActionDefinition = {
  key: "tag-attach",
  type: "perform",
  resource: "tag",
  title: "Attach a tag to an item",
  description: "Put an existing tag on an item.",
  idempotent: true,
  params: [
    BOARD_PARAM,
    { key: "itemId", label: "Item ID", type: "string", required: true, default: "" },
    { key: "tagId", label: "Tag ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "itemId", type: "string", label: "Item ID" },
    { key: "tagId", type: "string", label: "Tag ID" },
    { key: "attached", type: "boolean", label: "Attached" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const boardId = String(p.boardId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    const tagId = String(p.tagId ?? "").trim();
    if (!boardId) throw new Error("`boardId` is required");
    if (!itemId) throw new Error("`itemId` is required");
    if (!tagId) throw new Error("`tagId` is required");

    ctx.log("info", "attaching Miro tag", { boardId, itemId, tagId });

    await new MiroClient(ctx).request(
      `/v2/boards/${encodeURIComponent(boardId)}/items/${encodeURIComponent(itemId)}`,
      { method: "POST", query: { tag_id: tagId } },
    );
    return { itemId, tagId, attached: true };
  },
};

export default action;
