import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import transactionSearch from "../actions/transaction-search.ts";

type Tx = { id?: string };
type CursorState = { cursor?: string };

const OVERLAP_MS = 120_000;
const MAX_PAGES = 5;

/**
 * Shape (b): the SAME `transaction-search` action filtered by `createdFrom` (GraphQL
 * `createdAt.greaterThanOrEqualTo`) = cursor - 120 s, deduped by transaction id.
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
  async poll(call, ctx) {
    const now = new Date(Date.now()).toISOString();
    const cursor = (call.state as CursorState | undefined)?.cursor ?? now;
    const createdFrom = new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString();
    const items: Tx[] = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await transactionSearch.execute(
        { ...(call.params as Record<string, unknown>), createdFrom, first: 100, after },
        ctx,
      ) as { transactions?: Tx[]; hasNextPage?: boolean; endCursor?: string | null };
      items.push(...(result.transactions ?? []));
      if (!result.hasNextPage || !result.endCursor) break;
      after = result.endCursor;
    }
    const polled = await pollNewItems({
      state: call.state,
      fetchPage: () => Promise.resolve({ items }),
      idOf: (item) => String(item.id),
      maxPages: 1,
      maxEvents: 100,
      seenWindow: 1000,
    });
    return { ...polled, nextState: { ...polled.nextState, cursor: now } };
  },
};

export default trigger;
