import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient, splitIds } from "../lib/client.ts";

/**
 * `POST /reader/api/0/edit-tag` (zone 2) — add and/or remove a tag on articles. `a` is the tag to
 * add, `r` the tag to remove, `i` the item id, repeated for several items. Both id forms are
 * accepted (`tag:google.com,2005:reader/item/…` or the shortened decimal id, which the vendor
 * prefers "as it saves bandwidth"). System tags: `user/-/state/com.google/read`, `starred`,
 * `broadcast`, `like`; custom tags are `user/-/label/<name>`. Answers `OK`.
 *
 * Caveat from the vendor: an article older than its feed's `firstitemmsec` cannot be marked
 * unread — "The API will silently ignore this request." An `OK` therefore does not prove the
 * state changed for such items.
 *
 * Parameters ride the query string as in the vendor's example, so the item list is capped at
 * 100 per call (this app's limit, not the vendor's) to keep the URL bounded.
 */
interface Input {
  itemIds: string;
  addTag?: string;
  removeTag?: string;
}

export const MAX_ITEMS = 100;

const itemTagsEdit: ActionDefinition<Input> = {
  key: "item-tags-edit",
  type: "perform",
  resource: "items",
  title: "Edit Article Tags",
  description:
    "Add or remove a tag (read, starred, liked, broadcast or a custom label) on articles.",
  idempotent: true,
  params: [
    {
      key: "itemIds",
      label: "Article IDs",
      type: "text",
      required: true,
      hint: "Comma- or newline-separated, up to 100. The short decimal id (344691561) or the " +
        "long `tag:google.com,2005:reader/item/…` form.",
    },
    {
      key: "addTag",
      label: "Tag to add",
      type: "string",
      placeholder: "user/-/state/com.google/starred",
      hint: "A system tag (user/-/state/com.google/read | starred | broadcast | like) or " +
        "`user/-/label/<name>`.",
    },
    {
      key: "removeTag",
      label: "Tag to remove",
      type: "string",
      placeholder: "user/-/state/com.google/read",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Inoreader confirmed with OK" },
    { key: "itemCount", type: "number", label: "Articles sent" },
  ],

  async execute(input, ctx) {
    const ids = splitIds(input.itemIds);
    if (ids.length === 0) throw new Error("itemIds must name at least one article");
    if (ids.length > MAX_ITEMS) {
      throw new Error(`at most ${MAX_ITEMS} articles per call (got ${ids.length})`);
    }
    const a = input.addTag?.trim();
    const r = input.removeTag?.trim();
    if (!a && !r) throw new Error("give a tag to add, a tag to remove, or both");
    await new InoreaderClient(ctx).ok("/edit-tag", { query: { a, r, i: ids } });
    return { ok: true, itemCount: ids.length };
  },
};

export default itemTagsEdit;
