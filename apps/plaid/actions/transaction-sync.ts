import type { ActionDefinition } from "@w6w/types";
import { compact, PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM } from "../lib/params.ts";

/**
 * `POST /transactions/sync` — the transactions endpoint to use, and the reason
 * this app has no date-range one.
 *
 * ## Why sync rather than `/transactions/get`
 *
 * Bank transactions are not immutable. A pending charge becomes a posted one
 * with a different amount and a different id; a merchant name is enriched days
 * later; a transaction is removed entirely. A date-range read cannot express
 * any of that — it returns what is true *now* for a window, so a workflow
 * re-reading last week's window sees changes it cannot distinguish from new
 * data.
 *
 * `/transactions/sync` answers the right question: **what has changed since the
 * cursor I last saw**. It returns `added`, `modified` and `removed` separately,
 * and a fresh cursor. Store the cursor, pass it next run, and a workflow stays
 * correct through amendments and removals without re-reading anything.
 *
 * That is why this app implements sync and not `/transactions/get`, which Plaid
 * itself now positions as the legacy path.
 *
 * ## Two things to get right
 *
 * **The first call has no cursor**, and returns the Item's whole history in
 * pages — `has_more` is true until it is not, and each page carries the next
 * cursor. This action follows that loop for you, bounded by a page limit.
 *
 * **A cursor is per Item.** Passing one Item's cursor to another is not an
 * error at the type level and is nonsense at the data level.
 */
const action: ActionDefinition = {
  key: "transaction-sync",
  type: "read",
  resource: "transaction",
  title: "Sync transactions",
  description:
    "What has changed since a cursor — added, modified and removed, separately. The correct " +
    "way to follow an account, because bank transactions are amended after the fact.",
  params: [
    ACCESS_TOKEN_PARAM,
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      default: "",
      hint: "From the previous run's `nextCursor`. Empty means the beginning of the Item's " +
        "history — which on the first run is everything.",
    },
    {
      key: "maxPages",
      label: "Maximum Pages",
      type: "number",
      default: 10,
      hint: "A ceiling on the has_more loop. The first sync of a busy account can be many pages.",
    },
    {
      key: "count",
      label: "Page Size",
      type: "number",
      default: 100,
      advanced: true,
      hint: "Transactions per page. Plaid's maximum is 500.",
    },
  ],
  output: [
    { key: "added", type: "array", label: "Added" },
    { key: "modified", type: "array", label: "Modified" },
    { key: "removed", type: "array", label: "Removed (ids only)" },
    { key: "nextCursor", type: "string", label: "Next cursor — store and pass next run" },
    { key: "hasMore", type: "boolean", label: "More pages remained" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");

    const client = new PlaidClient(ctx);
    const count = Math.min(500, Math.max(1, Number(p.count ?? 100)));
    const maxPages = Math.max(1, Number(p.maxPages ?? 10));

    const added: unknown[] = [];
    const modified: unknown[] = [];
    const removed: unknown[] = [];
    let cursor = String(p.cursor ?? "").trim() || undefined;
    let hasMore = true;
    let pages = 0;

    while (hasMore && pages < maxPages) {
      const body = await client.request<{
        added?: unknown[];
        modified?: unknown[];
        removed?: unknown[];
        next_cursor?: string;
        has_more?: boolean;
      }>("/transactions/sync", compact({ access_token: accessToken, cursor, count }));

      added.push(...(body?.added ?? []));
      modified.push(...(body?.modified ?? []));
      removed.push(...(body?.removed ?? []));
      cursor = body?.next_cursor ?? cursor;
      hasMore = body?.has_more === true;
      pages += 1;
    }

    ctx.log("info", "synced Plaid transactions", {
      pages,
      added: added.length,
      modified: modified.length,
      removed: removed.length,
      hasMore,
    });
    // `hasMore` true here means the page ceiling was hit, not that sync failed —
    // the caller should run again with the returned cursor.
    return { added, modified, removed, nextCursor: cursor, hasMore };
  },
};

export default action;
