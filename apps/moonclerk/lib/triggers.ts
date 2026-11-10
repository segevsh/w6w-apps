import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollWindow } from "./window.ts";
import customerList from "../actions/customer-list.ts";

const OVERLAP_MS = 2 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
/** Pages one check reads; a bigger window resumes next check. */
const MAX_PAGES = 5;
const SEEN_WINDOW = 1000;

export const clock = { now: (): number => Date.now() };

interface Customer {
  id: number;
  checkout?: { date?: unknown };
  [key: string]: unknown;
}

function checkoutFrom(sinceMs: number): string {
  return new Date(sinceMs).toISOString().slice(0, 10);
}

/**
 * `checkout_from` has day granularity and no usable upper bound, so a window that holds more than
 * one read resumes by offset (brief 9.8). The feed is newest-first: an arrival while it drains
 * pushes records to a LATER offset (a re-read, deduped by the seen ids), never skips one.
 */
export function checkNewCustomer(state: unknown, ctx: HookContext) {
  return pollWindow<Customer, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf: (customer) => String(customer.id),
    tsOf: (customer) => {
      // The customer's checkout moment (`checkout.date`, ISO 8601 UTC).
      const ms = Date.parse(String(customer.checkout?.date ?? ""));
      return Number.isNaN(ms) ? undefined : ms;
    },
    async load(since, offset) {
      const result = await customerList.execute(
        { checkoutFrom: checkoutFrom(since), count: PAGE_SIZE, offset: offset ?? 0 },
        ctx,
      ) as { customers?: Customer[] };
      const items = result.customers ?? [];
      return { items, next: items.length >= PAGE_SIZE ? (offset ?? 0) + PAGE_SIZE : undefined };
    },
  });
}

export const newCustomerTrigger: TriggerDefinition = {
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly checked-out MoonClerk customer.",
  output: [{ key: "id", type: "number", label: "Customer ID" }],
  sample: { id: 101 },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewCustomer(state, ctx);
  },
};
