import type { TriggerDefinition } from "@w6w/types";
import { pollToken } from "../../_shared/poll/mod.ts";
import transactionSync from "../actions/transaction-sync.ts";
import { ACCESS_TOKEN_PARAM } from "../lib/params.ts";

/** Updates per Plaid page (`count`), pages per check, and so the most one check can read. */
const COUNT = 100;
const CHECK_PAGES = 5;
/** Seeding walks the Item's whole history once; a generous ceiling, then a loud failure. */
const SEED_CALLS = 100;
const SEED_PAGES = 10;
const SEED_COUNT = 500;

type Sync = { added?: unknown[]; nextCursor?: string; hasMore?: boolean };

/**
 * `POST /transactions/sync` is a cursor change feed: each response carries `added`, `modified`,
 * `removed` and a `next_cursor` that is "valid for at least 1 year" once every page is pulled
 * (https://plaid.com/docs/api/products/transactions/#transactionssync). That is the pollToken shape:
 * the stored token IS the cursor. The seed walks the whole history once without emitting anything
 * (Plaid supports `cursor: "now"` only for migrating from `/transactions/get`, so it cannot be used
 * here). A check pulls one whole update (up to CHECK_PAGES pages) and emits its `added`; the
 * modified and removed lists are not events of this trigger.
 */
const trigger: TriggerDefinition = {
  key: "new-transaction",
  title: "New Transaction",
  description: "The run gets each transaction newly added to a connected bank account (an Item).",
  params: [ACCESS_TOKEN_PARAM],
  output: [
    { key: "transaction_id", type: "string", label: "Transaction ID" },
    { key: "account_id", type: "string", label: "Account ID" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "iso_currency_code", type: "string", label: "Currency" },
    { key: "date", type: "string", label: "Date" },
    { key: "name", type: "string", label: "Name" },
    { key: "merchant_name", type: "string", label: "Merchant" },
    { key: "pending", type: "boolean", label: "Pending" },
  ],
  sample: {
    transaction_id: "sample-transaction-id",
    account_id: "sample-account-id",
    amount: 12.5,
    iso_currency_code: "USD",
    date: "2026-11-09",
    name: "Sample Coffee Shop",
    merchant_name: "Sample Coffee",
    pending: false,
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const accessToken = String((params as Record<string, unknown>)?.accessToken ?? "");
    const sync = (cursor: string, maxPages: number, count: number) =>
      transactionSync.execute({ accessToken, cursor, maxPages, count }, ctx) as Promise<Sync>;
    return await pollToken<unknown>({
      state,
      maxEvents: COUNT * CHECK_PAGES,
      async seed() {
        let cursor = "";
        for (let i = 0; i < SEED_CALLS; i++) {
          const res = await sync(cursor, SEED_PAGES, SEED_COUNT);
          cursor = res.nextCursor ?? cursor;
          if (res.hasMore !== true) {
            if (!cursor) throw new Error("Plaid transactions are not ready for this Item yet");
            return cursor;
          }
        }
        throw new Error("Plaid transaction history is too long to seed a trigger");
      },
      async changes(token) {
        const res = await sync(token, CHECK_PAGES, COUNT);
        return { items: res.added ?? [], nextToken: res.nextCursor ?? token };
      },
    });
  },
};

export default trigger;
