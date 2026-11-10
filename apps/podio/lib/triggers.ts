import type { ActionDefinition, OutputField } from "@w6w/types";
import { pollFromListAction, pollSnapshot, pollToken } from "../../_shared/poll/mod.ts";

/** Rows per page requested from the filter endpoint (Podio documents up to 500). */
export const PAGE_SIZE = 100;

/** An item feed over `item-filter`: newest by `created_on` or by `last_edit_on`, descending. */
export function itemFeed(spec: {
  key: string;
  title: string;
  description: string;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  sortBy: "created_on" | "last_edit_on";
  output: OutputField[];
  sample: unknown;
}) {
  const updated = spec.sortBy === "last_edit_on";
  return pollFromListAction<{ appId: string }>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    params: [{
      key: "appId",
      label: "App ID",
      type: "string",
      required: true,
      hint: "Numeric app id. Use List Apps in Workspace to find it.",
    }],
    input: ({ appId }) => ({
      appId,
      sortBy: spec.sortBy,
      sortDesc: true,
      limit: PAGE_SIZE,
      offset: 0,
    }),
    items: (r) => (r as { items?: unknown[] }).items ?? [],
    idOf: (x) => {
      const item = x as { item_id?: unknown; last_edit_on?: unknown };
      if (item.item_id === undefined || item.item_id === null) {
        throw new Error(`${spec.key}: Podio item has no item_id`);
      }
      return updated
        ? `${String(item.item_id)}:${String(item.last_edit_on ?? "")}`
        : String(item.item_id);
    },
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  });
}

/** A bounded collection (apps of a space, spaces of an org, orgs of a user): emit what is new. */
export async function snapshotAdded(
  state: unknown,
  list: unknown[],
  idKey: string,
): Promise<{ events: unknown[]; nextState: unknown }> {
  const rows = list.map((v) => {
    const id = (v as Record<string, unknown>)[idKey];
    if (id === undefined || id === null) throw new Error(`Podio record has no ${idKey}`);
    return { key: String(id), values: v };
  });
  const { events, nextState } = await pollSnapshot({
    state,
    rows,
    emit: { added: true, updated: false, removed: false },
  });
  return { events: events.map((e) => e.values), nextState };
}

/** Comments are listed oldest first (`GET /comment/{type}/{id}/`, no sort parameter). */
const COMMENT_PAGE = 100;
/** Seed reads at most this many pages (2000 comments) to learn the thread length. */
const SEED_PAGES = 20;

interface CommentPos {
  /** Comments already consumed (the next offset, minus the one-comment overlap). */
  count: number;
  lastId: string | null;
}

const RESEED = "podio-comments-reseed";

type CommentPage = (offset: number, limit: number) => Promise<unknown[]>;

/**
 * New comments on one object. The list is oldest first with offset paging, so state keeps how many
 * comments were consumed plus the last one's id. Each check re-reads the last consumed comment as
 * a one-row overlap: if it is no longer there (a comment was deleted, offsets shifted) the thread
 * is re-baselined rather than guessing. A thread longer than one page resumes at the saved offset
 * on the next check.
 */
export function pollComments(state: unknown, page: CommentPage) {
  const idOf = (c: unknown) => String((c as { comment_id?: unknown }).comment_id ?? "");
  return pollToken<unknown>({
    state,
    maxEvents: COMMENT_PAGE,
    async seed() {
      let count = 0;
      let lastId: string | null = null;
      for (let i = 0; i < SEED_PAGES; i++) {
        const rows = await page(count, COMMENT_PAGE);
        if (rows.length > 0) lastId = idOf(rows[rows.length - 1]);
        count += rows.length;
        if (rows.length < COMMENT_PAGE) {
          return JSON.stringify({ count, lastId } satisfies CommentPos);
        }
      }
      throw new Error(
        `Podio object has more than ${SEED_PAGES * COMMENT_PAGE} comments; too long to watch`,
      );
    },
    async changes(token) {
      const pos = JSON.parse(token) as CommentPos;
      const start = Math.max(pos.count - 1, 0);
      let rows = await page(start, COMMENT_PAGE);
      if (pos.count > 0) {
        if (rows.length === 0 || idOf(rows[0]) !== pos.lastId) throw new Error(RESEED);
        rows = rows.slice(1);
      }
      const next: CommentPos = {
        count: pos.count + rows.length,
        lastId: rows.length > 0 ? idOf(rows[rows.length - 1]) : pos.lastId,
      };
      return { items: rows, nextToken: JSON.stringify(next) };
    },
    isExpired: (err) => err instanceof Error && err.message === RESEED,
  });
}
