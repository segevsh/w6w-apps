import type { TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "../lib/window.ts";
import transactionSearch from "../actions/transaction-search.ts";

type Tx = { id?: string; createdAt?: string };

const OVERLAP_MS = 120_000;
const MAX_PAGES = 5;
const PAGE_SIZE = 100;
const MAX_EVENTS = MAX_PAGES * PAGE_SIZE;
const SEEN_WINDOW = MAX_EVENTS + PAGE_SIZE;

/**
 * Shape (b): the SAME `transaction-search` action filtered by `createdFrom` (GraphQL
 * `createdAt.greaterThanOrEqualTo`) = cursor - 120 s, deduped by transaction id. A window longer
 * than `MAX_PAGES` pages is resumed from the persisted GraphQL `endCursor` on the next check and
 * the cursor moves only once it drains (brief 9.8); the seed stores `floor = now` and later checks
 * drop transactions created before it (brief 9.9).
 */
const trigger: TriggerDefinition = {
  key: "new-transaction",
  title: "New Transaction",
  description: "The run gets each newly created Braintree transaction.",
  type: "poll",
  minIntervalMs: 300_000,
  params: transactionSearch.params,
  output: [{ key: "id", type: "string", label: "Transaction ID" }],
  sample: { id: "transaction_1", createdAt: "2026-11-09T00:00:00Z" },
  poll(call, ctx) {
    return pollWindow<Tx, string>({
      state: call.state,
      now: Date.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (item) => String(item.id),
      tsOf: (item) => toMs(item.createdAt),
      async load(sinceMs, after) {
        const result = await transactionSearch.execute(
          {
            ...(call.params as Record<string, unknown>),
            createdFrom: new Date(sinceMs).toISOString(),
            first: PAGE_SIZE,
            after,
          },
          ctx,
        ) as { transactions?: Tx[]; hasNextPage?: boolean; endCursor?: string | null };
        return {
          items: result.transactions ?? [],
          next: result.hasNextPage && result.endCursor ? result.endCursor : undefined,
        };
      },
    });
  },
};

export default trigger;
