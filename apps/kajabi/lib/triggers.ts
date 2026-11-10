import type { ActionDefinition, HookContext, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";
import contactNoteList from "../actions/contact-note-list.ts";
import contactOfferList from "../actions/contact-offer-list.ts";
import contactTagList from "../actions/contact-tag-list.ts";
import courseList from "../actions/course-list.ts";
import customerList from "../actions/customer-list.ts";
import formList from "../actions/form-list.ts";
import formSubmissionList from "../actions/form-submission-list.ts";
import offerList from "../actions/offer-list.ts";
import offerProductList from "../actions/offer-product-list.ts";
import orderItemList from "../actions/order-item-list.ts";
import orderList from "../actions/order-list.ts";
import payoutList from "../actions/payout-list.ts";
import productList from "../actions/product-list.ts";
import purchaseList from "../actions/purchase-list.ts";
import transactionList from "../actions/transaction-list.ts";

/** Injectable clock so tests can pin the since-filter floor and cursor. */
export const clock = { now: (): number => Date.now() };

const PAGE_SIZE = 100;
const DAY_MS = 86_400_000;

type Row = Record<string, unknown>;
type Params = Record<string, unknown>;

const listItems = (result: unknown): unknown[] => (result as { data?: unknown[] }).data ?? [];
const idOf = (item: unknown) => String((item as { id?: unknown }).id ?? "");
const attrOf = (item: unknown, name: string): string => {
  const attributes = (item as { attributes?: Row }).attributes;
  return String(attributes?.[name] ?? "");
};
const updatedIdOf = (item: unknown) => `${idOf(item)}:${attrOf(item, "updated_at")}`;

const siteParam: Param = {
  key: "siteId",
  label: "Site ID",
  type: "string",
  hint: "Kajabi requires a site when the account has more than one. `site-list` returns the ids.",
};
const output = [
  { key: "id", type: "string", label: "Record ID" },
  { key: "attributes", type: "object", label: "Record attributes" },
] as const;
const sample = (type: string, attributes: Row) => ({ id: "123", type, attributes });

function optional(params: Params, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value !== "" ? value : undefined;
}

interface NewestSpec {
  key: string;
  title: string;
  record: string;
  action: ActionDefinition;
  sortField: "created_at" | "updated_at";
  params: Param[];
  filters(params: Params): Params;
  sample: unknown;
  updated?: boolean;
}

/** Shape (a): newest-first through `sort=-created_at` / `sort=-updated_at`. */
function newest(spec: NewestSpec): TriggerDefinition {
  return pollFromListAction({
    key: spec.key,
    title: spec.title,
    description: spec.updated
      ? `The run gets each ${spec.record} that is new or edited since the last check, polled from the existing \`${spec.action.key}\` action sorted by \`updated_at\` descending.`
      : `The run gets each newly created ${spec.record}, oldest first, polled from the existing \`${spec.action.key}\` action sorted by \`created_at\` descending.`,
    action: spec.action,
    params: spec.params,
    input: (params: Params) => ({
      ...spec.filters(params),
      sort: `-${spec.sortField}`,
      pageNumber: 1,
      pageSize: PAGE_SIZE,
    }),
    items: listItems,
    idOf: spec.updated ? updatedIdOf : idOf,
    output: [...output],
    sample: spec.sample,
    maxPages: 1,
  });
}

const siteFilter = (params: Params) => ({ siteId: optional(params, "siteId") });

export const newCustomer = newest({
  key: "new-customer",
  title: "New Customer",
  record: "customer",
  action: customerList,
  sortField: "created_at",
  params: [siteParam],
  filters: siteFilter,
  sample: sample("customers", { name: "Ada Lovelace", email: "ada@example.com" }),
});
export const newOrder = newest({
  key: "new-order",
  title: "New Order",
  record: "order",
  action: orderList,
  sortField: "created_at",
  params: [siteParam],
  filters: siteFilter,
  sample: sample("orders", { order_number: 1001, created_at: "2026-11-10T10:00:00Z" }),
});
export const newOrderItem = newest({
  key: "new-order-item",
  title: "New Order Item",
  record: "order item",
  action: orderItemList,
  sortField: "created_at",
  params: [siteParam],
  filters: siteFilter,
  sample: sample("order_items", { quantity: 1, created_at: "2026-11-10T10:00:00Z" }),
});
export const newPurchase = newest({
  key: "new-purchase",
  title: "New Purchase",
  record: "purchase",
  action: purchaseList,
  sortField: "created_at",
  params: [siteParam],
  filters: siteFilter,
  sample: sample("purchases", { created_at: "2026-11-10T10:00:00Z", deactivated_at: null }),
});
export const newOrUpdatedPurchase = newest({
  key: "new-or-updated-purchase",
  title: "New or Updated Purchase",
  record: "purchase",
  action: purchaseList,
  sortField: "updated_at",
  params: [siteParam],
  filters: siteFilter,
  sample: sample("purchases", { updated_at: "2026-11-10T10:00:00Z", deactivated_at: null }),
  updated: true,
});

const formParam: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  hint: "Only submissions of this form. Empty = every form. `form-list` returns the ids.",
};
export const newFormSubmission = newest({
  key: "new-form-submission",
  title: "New Form Submission",
  record: "form submission",
  action: formSubmissionList,
  sortField: "created_at",
  params: [siteParam, formParam],
  filters: (params) => ({ ...siteFilter(params), formId: optional(params, "formId") }),
  sample: sample("form_submissions", { name: "Ada Lovelace", email: "ada@example.com" }),
});

const contactParam: Param = {
  key: "contactId",
  label: "Contact ID",
  type: "string",
  hint:
    "Only notes on this contact. Empty = every note on the site. `contact-list` returns the ids.",
};
const noteFilters = (params: Params) => ({
  ...siteFilter(params),
  contactId: optional(params, "contactId"),
});
export const newContactNote = newest({
  key: "new-contact-note",
  title: "New Contact Note",
  record: "contact note",
  action: contactNoteList,
  sortField: "created_at",
  params: [siteParam, contactParam],
  filters: noteFilters,
  sample: sample("contact_notes", {
    body: "Asked about the annual plan",
    created_at: "2026-11-10T10:00:00Z",
  }),
});
export const newOrUpdatedContactNote = newest({
  key: "new-or-updated-contact-note",
  title: "New or Updated Contact Note",
  record: "contact note",
  action: contactNoteList,
  sortField: "updated_at",
  params: [siteParam, contactParam],
  filters: noteFilters,
  sample: sample("contact_notes", {
    body: "Asked about the annual plan",
    updated_at: "2026-11-10T10:00:00Z",
  }),
  updated: true,
});

interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  action: unknown;
  params: Param[];
  input(params: Params): Params;
  /** Paged collections walk `page[number]` up to `maxPages`; relationship routes are one request. */
  paged: boolean;
  sample: unknown;
}

const MAX_PAGES = 5;

async function snapshotRows(
  spec: SnapshotSpec,
  params: Params,
  ctx: HookContext,
): Promise<unknown[]> {
  const action = spec.action as unknown as {
    execute(input: Params, context: HookContext): Promise<unknown>;
  };
  if (!spec.paged) return listItems(await action.execute(spec.input(params), ctx));
  const rows: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const items = listItems(
      await action.execute(
        { ...spec.input(params), pageNumber: page, pageSize: PAGE_SIZE },
        ctx,
      ),
    );
    rows.push(...items);
    if (items.length < PAGE_SIZE) return rows;
  }
  throw new Error(
    `${spec.key}: more than ${MAX_PAGES * PAGE_SIZE} records; the snapshot trigger is capped there`,
  );
}

/** Shape (c): the whole collection fits a few bounded pages, so a snapshot diff finds additions. */
function snapshot(spec: SnapshotSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: [...output],
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx: HookContext) {
      const rows = await snapshotRows(spec, (params ?? {}) as Params, ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: rows.map((item) => ({ key: idOf(item), values: item })),
        emit: { added: true, updated: false, removed: false },
        maxRows: MAX_PAGES * PAGE_SIZE,
      });
      return { events: events.map((event) => event.values), nextState };
    },
  };
}

const titleSort = (params: Params) => ({ ...siteFilter(params), sort: "title" });
export const newOffer = snapshot({
  key: "new-offer",
  title: "New Offer",
  description:
    "The run gets each offer added to the site, found by comparing the site's offer list (at most 500) with the last check.",
  action: offerList,
  params: [siteParam],
  input: titleSort,
  paged: true,
  sample: sample("offers", { title: "Annual membership", price_in_cents: 29900 }),
});
export const newProduct = snapshot({
  key: "new-product",
  title: "New Product",
  description:
    "The run gets each product added to the site, found by comparing the site's product list (at most 500) with the last check.",
  action: productList,
  params: [siteParam],
  input: (params) => ({ ...siteFilter(params), sort: "title" }),
  paged: true,
  sample: sample("products", { title: "Intro course", status: "published" }),
});
export const newCourse = snapshot({
  key: "new-course",
  title: "New Course",
  description:
    "The run gets each course added to the site, found by comparing the site's course list (at most 500) with the last check.",
  action: courseList,
  params: [siteParam],
  input: titleSort,
  paged: true,
  sample: sample("courses", { title: "Intro course", publish_status: "published" }),
});
export const newForm = snapshot({
  key: "new-form",
  title: "New Form",
  description:
    "The run gets each form added to the site, found by comparing the site's form list (at most 500) with the last check.",
  action: formList,
  params: [siteParam],
  input: titleSort,
  paged: true,
  sample: sample("forms", { title: "Newsletter signup" }),
});

const requiredParam = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "string",
  required: true,
  hint,
});
export const newContactTag = snapshot({
  key: "new-contact-tag",
  title: "New Contact Tag",
  description: "The run gets each tag newly attached to the selected contact.",
  action: contactTagList,
  params: [requiredParam("contactId", "Contact ID", "`contact-list` returns the ids.")],
  input: (params) => ({ contactId: params.contactId }),
  paged: false,
  sample: { id: "45", type: "contact_tags" },
});
export const newContactOffer = snapshot({
  key: "new-contact-offer",
  title: "New Contact Offer",
  description: "The run gets each offer newly granted to the selected contact.",
  action: contactOfferList,
  params: [requiredParam("contactId", "Contact ID", "`contact-list` returns the ids.")],
  input: (params) => ({ contactId: params.contactId }),
  paged: false,
  sample: { id: "67", type: "offers" },
});
export const newOfferProduct = snapshot({
  key: "new-offer-product",
  title: "New Offer Product",
  description: "The run gets each product newly added to the selected offer.",
  action: offerProductList,
  params: [requiredParam("offerId", "Offer ID", "`offer-list` returns the ids.")],
  input: (params) => ({ offerId: params.offerId }),
  paged: false,
  sample: { id: "89", type: "products" },
});

interface SinceState {
  v: 1;
  kind: "since";
  seeded: true;
  /** Records created before this instant (ms) are never emitted (seed time). */
  floor: number;
  /** Start of the last fully drained window (ms). */
  cursor: number;
  /** Ids already emitted, FIFO, newest last. */
  ids: string[];
  /** A window that is still being drained across checks. */
  resume?: { page: number; windowAt: number; startedAt: number };
}

const SINCE_PAGES = 3;
const SEEN_WINDOW = 2000;

const isSinceState = (state: unknown): state is SinceState => {
  const s = state as Partial<SinceState> | null;
  return s?.v === 1 && s.kind === "since" && s.seeded === true && typeof s.floor === "number" &&
    typeof s.cursor === "number" && Array.isArray(s.ids);
};

/**
 * Shape (b): `transaction-list` has a `filter[start_date]` (a calendar day) but documents no sort.
 * Each check reads the window `[day(cursor - 1 day), now]` in at most `SINCE_PAGES` pages, remembers
 * the next page when the window is longer than that (so it drains over successive checks instead of
 * re-reading page 1), and only then advances the cursor. The seed stores `floor = now` and reads
 * nothing; records created before the floor are dropped on every later check.
 */
interface SinceSpec {
  key: string;
  title: string;
  description: string;
  action: unknown;
  /** Attribute holding the record's creation instant. */
  stamp: string;
  /** Kajabi marks `siteId` required on this endpoint. */
  siteRequired?: boolean;
  /** Page size sent, or undefined when the endpoint documents none (drain until an empty page). */
  pageSize?: number;
  sample: unknown;
}

function since(spec: SinceSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [spec.siteRequired ? { ...siteParam, required: true } : siteParam],
    output: [...output],
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx: HookContext) {
      if (!isSinceState(state)) {
        const now = clock.now();
        const seeded: SinceState = {
          v: 1,
          kind: "since",
          seeded: true,
          floor: now,
          cursor: now,
          ids: [],
        };
        return { events: [], nextState: seeded };
      }
      const action = spec.action as {
        execute(input: Params, context: HookContext): Promise<unknown>;
      };
      const windowAt = state.resume?.windowAt ?? state.cursor;
      const startedAt = state.resume?.startedAt ?? clock.now();
      const startDate = new Date(windowAt - DAY_MS).toISOString().slice(0, 10);
      const seen = new Set(state.ids);
      const emitted: Array<{ ts: number; row: unknown }> = [];
      let page = state.resume?.page ?? 1;
      let drained = false;
      for (let n = 0; n < SINCE_PAGES; n++, page++) {
        const rows = listItems(
          await action.execute(
            {
              ...siteFilter((params ?? {}) as Params),
              startDate,
              pageNumber: page,
              ...(spec.pageSize ? { pageSize: spec.pageSize } : {}),
            },
            ctx,
          ),
        );
        for (const row of rows) {
          const id = idOf(row);
          if (!id || seen.has(id)) continue;
          const ts = Date.parse(attrOf(row, spec.stamp));
          if (Number.isFinite(ts) && ts < state.floor) continue;
          seen.add(id);
          emitted.push({ ts: Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER, row });
        }
        if (rows.length < (spec.pageSize ?? 1)) {
          drained = true;
          break;
        }
      }
      emitted.sort((a, b) => a.ts - b.ts);
      const ids = [...state.ids, ...emitted.map((e) => idOf(e.row))].slice(-SEEN_WINDOW);
      const nextState: SinceState = {
        v: 1,
        kind: "since",
        seeded: true,
        floor: state.floor,
        cursor: drained ? startedAt : state.cursor,
        ids,
        ...(drained ? {} : { resume: { page, windowAt, startedAt } }),
      };
      return { events: emitted.map((e) => e.row), nextState };
    },
  };
}

export const newTransaction = since({
  key: "new-transaction",
  title: "New Transaction",
  description:
    "The run gets each payment recorded since the last check, polled from the existing `transaction-list` action with `filter[start_date]` set to the day before the last check.",
  action: transactionList,
  stamp: "created_at",
  pageSize: PAGE_SIZE,
  sample: sample("transactions", { amount_in_cents: 9900, created_at: "2026-11-10T10:00:00Z" }),
});

/** Same shape as `new-transaction`; `payout-list` documents no page size, so it drains to an empty page. */
export const newPayout = since({
  key: "new-payout",
  title: "New Payout",
  description:
    "The run gets each payout initiated since the last check, polled from the existing `payout-list` action with `filter[start_date]` set to the day before the last check. Only applies to sites using Kajabi Payments.",
  action: payoutList,
  stamp: "initiated_date",
  siteRequired: true,
  sample: sample("kajabi_payments_payouts", { initiated_date: "2026-11-10T10:00:00Z" }),
});
