import type { HookContext, TriggerDefinition } from "@w6w/types";
import { type IdsState, pollNewItems } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

export const clock = { now: (): number => Date.now() };
const OVERLAP_MS = 120_000;

interface CustomerState extends IdsState {
  cursor: string;
}

function since(cursor: string): string {
  return new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString();
}

async function check(state: unknown, ctx: HookContext, updated: boolean) {
  const now = new Date(clock.now()).toISOString();
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "string" ? prior.cursor : now;
  const { events, nextState } = await pollNewItems<unknown>({
    state,
    maxPages: 1,
    maxEvents: 100,
    seenWindow: 200,
    idOf: (item) => {
      const row = item as { id?: unknown; modifiedOn?: unknown };
      return updated ? `${row.id ?? ""}:${row.modifiedOn ?? ""}` : String(row.id ?? "");
    },
    async fetchPage() {
      const result = await customerList.execute(
        updated
          ? { modifiedOnOrAfter: since(cursor), page: 1, pageSize: 100 }
          : { createdOnOrAfter: since(cursor), page: 1, pageSize: 100 },
        ctx,
      ) as { data?: unknown[] };
      return { items: result.data ?? [] };
    },
  });
  return { events, nextState: { ...nextState, cursor: now } as CustomerState };
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
