import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSinceWindow, type WindowState } from "./since-window.ts";
import customerList from "../actions/customer-list.ts";

export const clock = { now: (): number => Date.now() };
const OVERLAP_MS = 120_000;
const PAGE = 100;

interface Customer {
  id?: unknown;
  createdOn?: unknown;
  modifiedOn?: unknown;
}

function parseTime(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * ServiceTitan documents no list order, so this never relies on one: a window is read page by page
 * with a fixed `since`, the page number is persisted until `hasMore` is false, and the id dedupe
 * absorbs any row that moves between pages.
 */
function check(
  state: unknown,
  ctx: HookContext,
  updated: boolean,
): Promise<{ events: unknown[]; nextState: WindowState }> {
  return pollSinceWindow<Customer>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    firstPos: 1,
    step: 1,
    maxPages: 2,
    maxEvents: 2 * PAGE,
    seenWindow: 500,
    idOf: (row) => updated ? `${row.id ?? ""}:${row.modifiedOn ?? ""}` : String(row.id ?? ""),
    stampOf: (row) => parseTime(updated ? row.modifiedOn : row.createdOn),
    async fetchPage(sinceMs, page) {
      const since = new Date(sinceMs).toISOString();
      const result = await customerList.execute(
        updated
          ? { modifiedOnOrAfter: since, page, pageSize: PAGE }
          : { createdOnOrAfter: since, page, pageSize: PAGE },
        ctx,
      ) as { data?: Customer[]; hasMore?: boolean };
      const items = result.data ?? [];
      return { items, more: result.hasMore ?? items.length >= PAGE };
    },
  });
}

export const newCustomerTrigger: TriggerDefinition = {
  key: "new-customer",
  title: "New Customer",
  description: "Runs when ServiceTitan creates a customer.",
  output: [{ key: "id", type: "number", label: "Customer ID" }],
  sample: { id: 101, name: "Ada Lovelace" },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check(state, ctx, false);
  },
};

export const newOrUpdatedCustomerTrigger: TriggerDefinition = {
  key: "new-or-updated-customer",
  title: "New or Updated Customer",
  description: "Runs when ServiceTitan creates or updates a customer.",
  output: [{ key: "id", type: "number", label: "Customer ID" }],
  sample: { id: 101, modifiedOn: "2026-11-09T12:00:00Z" },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check(state, ctx, true);
  },
};
