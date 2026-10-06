import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient, splitIds, TAG_READ } from "../lib/client.ts";
import { MAX_ITEMS } from "./item-tags-edit.ts";

/**
 * Convenience over `POST /reader/api/0/edit-tag` (zone 2): mark specific articles read or unread
 * by adding or removing the system tag `user/-/state/com.google/read` — the exact use the Edit
 * tag page gives as its first example. Same silent-ignore caveat for marking old articles
 * unread (older than the feed's `firstitemmsec`).
 */
interface Input {
  itemIds: string;
  read?: boolean;
}

const itemsMarkRead: ActionDefinition<Input> = {
  key: "items-mark-read",
  type: "perform",
  resource: "items",
  title: "Mark Articles Read or Unread",
  description: "Mark specific articles as read (or back to unread).",
  idempotent: true,
  params: [
    {
      key: "itemIds",
      label: "Article IDs",
      type: "text",
      required: true,
      hint: "Comma- or newline-separated, up to 100. Short decimal or long form.",
    },
    { key: "read", label: "Mark as read", type: "boolean", default: true },
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
    const markRead = input.read !== false;
    await new InoreaderClient(ctx).ok("/edit-tag", {
      query: { a: markRead ? TAG_READ : undefined, r: markRead ? undefined : TAG_READ, i: ids },
    });
    return { ok: true, itemCount: ids.length };
  },
};

export default itemsMarkRead;
