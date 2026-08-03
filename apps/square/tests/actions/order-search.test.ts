import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/order-search.ts";

Deno.test("order-search: POSTs /v2/orders/search", async () => {
  const { ctx, calls } = mockCtx([{ body: { orders: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/orders/search");
  assertEquals(calls[0].method, "POST");
});

Deno.test("order-search: splits the comma-separated location ids", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ locationIds: "L1, L2 ,, L3" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).location_ids, ["L1", "L2", "L3"]);
});

Deno.test("order-search: builds Square's nested state filter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ states: ["OPEN", "COMPLETED"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).query.filter, {
    state_filter: { states: ["OPEN", "COMPLETED"] },
  });
});

Deno.test("order-search: builds the created-at date-time filter as a TimeRange", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { createdAfter: "2026-01-01T00:00:00Z", createdBefore: "2026-02-01T00:00:00Z" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).query.filter.date_time_filter, {
    created_at: { start_at: "2026-01-01T00:00:00Z", end_at: "2026-02-01T00:00:00Z" },
  });
});

Deno.test("order-search: a one-sided time range only sends the side that was given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ createdAfter: "2026-01-01T00:00:00Z" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).query.filter.date_time_filter.created_at, {
    start_at: "2026-01-01T00:00:00Z",
  });
});

Deno.test("order-search: builds the sort block from sortField and sortOrder", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ sortField: "UPDATED_AT", sortOrder: "ASC" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).query.sort, {
    sort_field: "UPDATED_AT",
    sort_order: "ASC",
  });
});

Deno.test("order-search: the advanced query JSON is merged over the assembled one", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    states: ["OPEN"],
    query: { filter: { fulfillment_filter: { fulfillment_states: ["PROPOSED"] } } },
  }, ctx);
  // The override replaces `filter` wholesale — a power user owns the shape.
  assertEquals(JSON.parse(calls[0].body!).query.filter, {
    fulfillment_filter: { fulfillment_states: ["PROPOSED"] },
  });
});

Deno.test("order-search: sends no query key at all when nothing is filtered or sorted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ sortField: "" }, ctx);
  assertEquals("query" in JSON.parse(calls[0].body!), false);
});

Deno.test("order-search: passes limit, cursor and return_entries through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ limit: 25, cursor: "c1", returnEntries: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.limit, 25);
  assertEquals(body.cursor, "c1");
  assertEquals(body.return_entries, true);
});

Deno.test("order-search: the state options are Square's OrderState enum", () => {
  const p = action.params?.find((p) => p.key === "states");
  assertEquals(
    optionValues(p),
    ["OPEN", "COMPLETED", "CANCELED", "DRAFT"],
  );
});

Deno.test("order-search: declares both response shapes in its output", () => {
  const keys = (action.output as Array<{ key: string }>).map((o) => o.key);
  assert(keys.includes("orders"));
  assert(keys.includes("order_entries"));
  assert(keys.includes("cursor"));
});
