import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";
import chargeList from "../actions/charge-list.ts";
import customerEventsList from "../actions/customer-events-list.ts";
import goalsList from "../actions/goals-list.ts";
import planList from "../actions/plan-list.ts";
import refundList from "../actions/refund-list.ts";
import sourcesList from "../actions/sources-list.ts";
import subscriptionList from "../actions/subscription-list.ts";
import { pollWindow, toMs } from "./window.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Per-check ceiling: 5 pages of 200. A longer window resumes from the persisted page. */
export const MAX_PAGES = 5;
export const PAGE_SIZE = 200;
/** At least maxPages * pageSize + one page, so an overlap re-list never evicts an emitted id. */
export const SEEN_WINDOW = MAX_PAGES * PAGE_SIZE + PAGE_SIZE;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export const SOURCE_PARAM: Param = {
  key: "sourceId",
  label: "Source ID",
  type: "string",
  required: true,
  hint: "The Baremetrics source (List Sources) whose records to watch.",
};

interface Paged {
  meta?: { pagination?: { has_more?: boolean } };
  [key: string]: unknown;
}

/** `created` is a unix timestamp in seconds. */
const createdMs = (item: { created?: unknown }): number | undefined =>
  typeof item.created === "number" ? item.created * 1000 : toMs(item.created);

function sinceTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  listKey: "charges" | "refunds";
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition<{ sourceId: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SOURCE_PARAM],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ params, state }, ctx) {
      return pollWindow<{ oid?: string; created?: number }, number>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: (item) => String(item.oid),
        tsOf: createdMs,
        async load(sinceMs, pos) {
          const page = pos ?? 0;
          const res = await spec.action.execute({
            source_id: params.sourceId,
            start: Math.floor(sinceMs / 1000),
            per_page: PAGE_SIZE,
            page,
          }, ctx) as Paged;
          const items = (res[spec.listKey] as Array<{ oid?: string; created?: number }>) ?? [];
          return {
            items: items.filter((i) => i.oid !== undefined && i.oid !== ""),
            next: res.meta?.pagination?.has_more ? page + 1 : undefined,
            read: items.length,
          };
        },
      });
    },
  };
}

const CUSTOMER_OUTPUT: OutputField = { key: "customer", type: "object", label: "Customer" };

export const newCharge = sinceTrigger({
  key: "new-charge",
  title: "New Charge",
  description: "The run gets each charge created in the chosen source.",
  action: chargeList as unknown as ActionDefinition,
  listKey: "charges",
  output: [
    { key: "oid", type: "string", label: "Charge OID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount (minor units)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "created", type: "number", label: "Created (unix seconds)" },
    CUSTOMER_OUTPUT,
  ],
  sample: {
    oid: "ch_1",
    source_id: "src1",
    status: "paid",
    amount: 4500,
    currency: "USD",
    created: 1788000000,
    customer: { oid: "cus_1", email: "customer@example.com" },
  },
});

export const newRefund = sinceTrigger({
  key: "new-refund",
  title: "New Refund",
  description: "The run gets each refund created in the chosen source.",
  action: refundList as unknown as ActionDefinition,
  listKey: "refunds",
  output: [
    { key: "oid", type: "string", label: "Refund OID" },
    { key: "charge_oid", type: "string", label: "Charge OID" },
    { key: "amount", type: "number", label: "Amount (minor units)" },
    { key: "created", type: "number", label: "Created (unix seconds)" },
    CUSTOMER_OUTPUT,
  ],
  sample: {
    oid: "re_1",
    source_id: "src1",
    charge_oid: "ch_1",
    amount: 4500,
    created: 1788000000,
    customer: { oid: "cus_1", email: "customer@example.com" },
  },
});

export const newSubscription = pollFromListAction<{ sourceId: string }>({
  key: "new-subscription",
  title: "New Subscription",
  description: "The run gets each newly created subscription in the chosen source.",
  action: subscriptionList as unknown as ActionDefinition,
  params: [SOURCE_PARAM],
  input: (params) => ({ source_id: params.sourceId, order: "desc", per_page: 100, page: 0 }),
  items: (result) => (result as { subscriptions?: unknown[] }).subscriptions ?? [],
  idOf: (item) => String((item as { oid?: unknown }).oid ?? ""),
  output: [
    { key: "oid", type: "string", label: "Subscription OID" },
    { key: "started_at", type: "number", label: "Started (unix seconds)" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "customer", type: "object", label: "Customer" },
  ],
  sample: {
    oid: "sub_1",
    source_id: "src1",
    started_at: 1788000000,
    active: true,
    customer: { oid: "cus_1", email: "customer@example.com" },
  },
  maxPages: 1,
});

/**
 * A bounded collection fetched whole (up to MAX_SNAPSHOT_PAGES pages of 200) and diffed by id, added
 * only: the rows hold the id alone, so renames or amount edits never read as a new record.
 */
async function snapshot<T extends Record<string, unknown>>(
  state: unknown,
  idKey: string,
  fetchPage: (page: number) => Promise<{ items: T[]; more: boolean }>,
) {
  const items: T[] = [];
  for (let page = 0; page < MAX_SNAPSHOT_PAGES; page++) {
    const res = await fetchPage(page);
    items.push(...res.items.filter((i) => i[idKey] !== undefined && i[idKey] !== ""));
    if (!res.more) break;
  }
  const byId = new Map(items.map((i) => [String(i[idKey]), i]));
  const { events, nextState } = await pollSnapshot({
    state,
    rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}
export const MAX_SNAPSHOT_PAGES = 5;

export const newPlan: TriggerDefinition<{ sourceId: string }> = {
  key: "new-plan",
  title: "New Plan",
  description: "The run gets each newly created plan in the chosen source.",
  params: [SOURCE_PARAM],
  output: [
    { key: "oid", type: "string", label: "Plan OID" },
    { key: "name", type: "string", label: "Name" },
    { key: "interval", type: "string", label: "Billing interval" },
    { key: "active", type: "boolean", label: "Active" },
  ],
  sample: { oid: "plan_1", source_id: "src1", name: "Pro", interval: "month", active: true },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return snapshot<{ oid?: string }>(state, "oid", async (page) => {
      const res = await planList.execute({
        source_id: params.sourceId,
        per_page: PAGE_SIZE,
        page,
      }, ctx) as Paged;
      return {
        items: (res.plans as Array<{ oid?: string }>) ?? [],
        more: res.meta?.pagination?.has_more === true,
      };
    });
  },
};

/**
 * `GET /v1/{source_id}/customers/{oid}/events` lists one customer's event log (pagination only, no
 * order or date filter), so the first MAX_SNAPSHOT_PAGES pages are diffed by event id, added only.
 */
export const newCustomerEvent: TriggerDefinition<{ sourceId: string; customerOid: string }> = {
  key: "new-customer-event",
  title: "New Customer Event",
  description: "The run gets each newly recorded event of the chosen customer.",
  params: [SOURCE_PARAM, {
    key: "customerOid",
    label: "Customer OID",
    type: "string",
    required: true,
    hint: "The customer (List Customers) whose events to watch.",
  }],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "timestamp", type: "number", label: "Timestamp" },
  ],
  sample: { id: "evt_1", type: "subscription_started", timestamp: 1788000000 },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return snapshot<{ id?: string }>(state, "id", async (page) => {
      const res = await customerEventsList.execute({
        source_id: params.sourceId,
        oid: params.customerOid,
        per_page: PAGE_SIZE,
        page,
      }, ctx) as Paged & { events?: Array<{ id?: string }> };
      return { items: res.events ?? [], more: res.meta?.pagination?.has_more === true };
    });
  },
};

export const newGoal: TriggerDefinition = {
  key: "new-goal",
  title: "New Goal",
  description: "The run gets each newly created revenue goal.",
  output: [
    { key: "id", type: "string", label: "Goal ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "metric", type: "string", label: "Metric" },
    { key: "end_date", type: "string", label: "End date" },
  ],
  sample: { id: "goal_1", name: "MRR Growth", metric: "mrr", end_date: "2026-12-31" },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return snapshot<{ id?: string }>(state, "id", async (page) => {
      const res = await goalsList.execute({ per_page: PAGE_SIZE, page }, ctx) as Paged;
      return {
        items: (res.goals as Array<{ id?: string }>) ?? [],
        more: res.meta?.pagination?.has_more === true,
      };
    });
  },
};

export const newSource: TriggerDefinition = {
  key: "new-source",
  title: "New Source",
  description: "The run gets each newly connected source (payment provider or API source).",
  output: [
    { key: "id", type: "string", label: "Source ID" },
    { key: "provider", type: "string", label: "Provider" },
    { key: "provider_id", type: "string", label: "Provider account ID" },
  ],
  sample: { id: "src1", provider: "stripe", provider_id: "acct_sample" },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return snapshot<{ id?: string }>(state, "id", async () => {
      const res = await sourcesList.execute({}, ctx) as { sources?: Array<{ id?: string }> };
      return { items: res.sources ?? [], more: false };
    });
  },
};
