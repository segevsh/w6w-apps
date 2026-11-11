import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import transactionList from "../actions/transaction-list.ts";
import { idOf, rows } from "../lib/triggers.ts";

/**
 * Since-filter poll over `transaction-list` (`updatedAfter`, a documented filter of GET
 * /v1/transactions: https://docs.givebutter.com/api-reference/transactions/list-all-transactions,
 * 2026-11-10). The list has no sort by update stamp, so the window is read in a stable
 * `sortBy=created_at` (ascending) order, ONE page of 100 per check.
 *
 *  - seed: stores `floor = now` and reads nothing; later checks drop every record whose
 *    `updated_at` is before the floor, so nothing that existed (and was untouched) before the
 *    seed is ever emitted, however many pages the overlap window holds.
 *  - window: `updatedAfter = cursor - 120 s`; a window longer than one page is drained across
 *    checks through a persisted `resume` page, and the cursor only advances (to the time the
 *    window was opened) once the last page has been read.
 *  - dedupe: `id:updated_at` keys, so an edit is a new event and a re-read record is not.
 */
const OVERLAP_MS = 120_000;
const PER_PAGE = 100;
const SEEN_CAP = 1000;

interface Since {
  seeded: true;
  floor: number;
  cursor: number;
  seen: string[];
  resume?: { page: number; sinceMs: number; windowEnd: number };
}

type Item = Record<string, unknown>;
const stampOf = (i: Item): number => Date.parse(String(i.updated_at ?? ""));
const keyOf = (i: Item) => `${idOf(i)}:${String(i.updated_at ?? "")}`;

const trigger: TriggerDefinition = {
  key: "new-or-updated-transaction",
  title: "New or Updated Transaction",
  description:
    "The run gets each Givebutter transaction that is newly created or edited (refund, status change, ...), once per edit.",
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const now = Date.now();
    const prev = state as Partial<Since> | null | undefined;
    if (
      !prev || prev.seeded !== true || typeof prev.floor !== "number" ||
      typeof prev.cursor !== "number"
    ) {
      const seed: Since = { seeded: true, floor: now, cursor: now, seen: [] };
      return { events: [], nextState: seed };
    }
    const resume = prev.resume;
    const sinceMs = resume?.sinceMs ?? prev.cursor - OVERLAP_MS;
    const windowEnd = resume?.windowEnd ?? now;
    const page = resume?.page ?? 1;
    const result = await (transactionList as unknown as ActionDefinition).execute(
      {
        updatedAfter: new Date(sinceMs).toISOString(),
        sortBy: "created_at",
        page,
        per_page: PER_PAGE,
      },
      ctx,
    ) as { data?: Item[]; meta?: { last_page?: unknown } };
    const items = rows(result) as Item[];
    const seen = new Set(prev.seen ?? []);
    const events: Item[] = [];
    for (const item of items) {
      const stamp = stampOf(item);
      if (Number.isFinite(stamp) && stamp < prev.floor) continue; // existed untouched before the seed
      const key = keyOf(item);
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(item);
    }
    const last = result?.meta?.last_page;
    const more = typeof last === "number" ? page < last : items.length >= PER_PAGE;
    const next: Since = {
      seeded: true,
      floor: prev.floor,
      cursor: more ? prev.cursor : windowEnd,
      seen: [...(prev.seen ?? []), ...events.map(keyOf)].slice(-SEEN_CAP),
      ...(more ? { resume: { page: page + 1, sinceMs, windowEnd } } : {}),
    };
    return { events, nextState: next };
  },
  output: [
    { key: "id", type: "string", label: "Transaction ID" },
    { key: "number", type: "string", label: "Transaction number" },
    { key: "status", type: "string", label: "Status" },
    { key: "method", type: "string", label: "Payment method" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "campaign_id", type: "number", label: "Campaign ID" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    id: "txn_1001",
    number: "T-1001",
    status: "succeeded",
    method: "card",
    amount: 50,
    campaign_id: 1201,
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-10T08:00:00Z",
  },
};

export default trigger;
