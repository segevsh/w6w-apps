import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

const OVERLAP_MS = 2 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
const SEEN_WINDOW = 300;

export const clock = { now: (): number => Date.now() };

interface Customer {
  id: number;
  [key: string]: unknown;
}

interface NewCustomerState {
  cursor: number;
}

function checkoutFrom(cursor: number): string {
  return new Date(cursor - OVERLAP_MS).toISOString().slice(0, 10);
}

export async function checkNewCustomer(
  state: unknown,
  ctx: HookContext,
): Promise<{ events: Customer[]; nextState: NewCustomerState }> {
  const checkedAt = clock.now();
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const { events, nextState } = await pollNewItems<Customer>({
    state,
    maxPages: 1,
    maxEvents: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf: (customer) => String(customer.id),
    async fetchPage() {
      const result = await customerList.execute(
        { checkoutFrom: checkoutFrom(cursor), count: PAGE_SIZE, offset: 0 },
        ctx,
      ) as { customers?: Customer[] };
      return { items: result.customers ?? [] };
    },
  });
  return { events, nextState: { ...nextState, cursor: checkedAt } };
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
