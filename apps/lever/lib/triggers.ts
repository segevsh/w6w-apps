import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import postingList from "../actions/posting-list.ts";

/** 50 pages of 100 — the most `pollSnapshot` will hold (5000 rows). */
const PAGE = 100;
const MAX_PAGES = 50;

interface Posting {
  id?: string;
  [key: string]: unknown;
}
interface Page {
  postings?: Posting[];
  nextCursor?: string;
  hasNext?: boolean;
}

/**
 * Every posting in the account, read through the existing `posting-list` action (same client,
 * endpoint and credential) one 100-row page at a time. A company's postings are a small bounded
 * collection, so the whole set is compared check to check rather than relying on an order the
 * list does not document.
 */
export async function allPostings(ctx: HookContext): Promise<Posting[]> {
  const rows: Posting[] = [];
  let cursor = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await (postingList as ActionDefinition).execute(
      { limit: PAGE, cursor },
      ctx,
    ) as Page;
    rows.push(...(result.postings ?? []));
    if (!result.hasNext || !result.nextCursor) return rows;
    cursor = result.nextCursor;
  }
  throw new Error(
    `lever postings trigger: more than ${
      MAX_PAGES * PAGE
    } postings; narrow the account or use a webhook`,
  );
}

const OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Posting ID" },
  { key: "text", type: "string", label: "Posting title" },
  { key: "state", type: "string", label: "State (published, internal, closed, draft, …)" },
  { key: "createdAt", type: "number", label: "Created at (ms)" },
  { key: "updatedAt", type: "number", label: "Updated at (ms)" },
];

const SAMPLE = {
  id: "f2f01e16-27f8-4711-a728-7d49499795a0",
  text: "Infrastructure Engineer",
  state: "published",
  createdAt: 1407779365624,
  updatedAt: 1407779365624,
};

/** `new-posting` emits added rows only; `new-or-updated-posting` also emits an edited row. */
export function postingTrigger(o: {
  key: string;
  title: string;
  description: string;
  updated: boolean;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    output: o.updated
      ? [{ key: "change", type: "string", label: "added or updated" }, ...OUTPUT]
      : OUTPUT,
    sample: o.updated ? { change: "updated", ...SAMPLE, updatedAt: 1407782965624 } : SAMPLE,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const postings = await allPostings(ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: postings.map((p) => ({ key: String(p.id), values: p })),
        emit: { added: true, updated: o.updated },
      });
      return {
        events: events.map((e) =>
          o.updated ? { change: e.change, ...(e.values as Posting) } : e.values
        ),
        nextState,
      };
    },
  };
}
