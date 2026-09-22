import { assertEquals, assertRejects } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/query-run-aggregation.ts";

Deno.test("query-run-aggregation: a COUNT is one aggregation over a StructuredQuery", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ result: { aggregateFields: { count: { integerValue: "42" } } }, readTime: "t" }],
  }], { display: DISPLAY });

  const result = await action.execute({ collectionId: "orders" }, ctx) as {
    result: Record<string, unknown>;
    readTime?: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents:runAggregationQuery",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.structuredAggregationQuery.structuredQuery, {
    from: [{ collectionId: "orders" }],
  });
  assertEquals(body.structuredAggregationQuery.aggregations, [{ count: {} }]);
  assertEquals(result.result, { count: 42 });
  assertEquals(result.readTime, "t");
});

Deno.test("query-run-aggregation: sum and avg carry a field and an alias", async () => {
  const sum = mockCtx([{ status: 200, body: [{ result: { aggregateFields: {} } }] }], {
    display: DISPLAY,
  });
  await action.execute({
    collectionId: "orders",
    aggregation: "sum",
    field: "amount",
    alias: "total",
  }, sum.ctx);
  assertEquals(JSON.parse(sum.calls[0].body!).structuredAggregationQuery.aggregations, [
    { sum: { field: { fieldPath: "amount" } }, alias: "total" },
  ]);

  const avg = mockCtx([{ status: 200, body: [{ result: { aggregateFields: {} } }] }], {
    display: DISPLAY,
  });
  await action.execute({ collectionId: "orders", aggregation: "avg", field: "amount" }, avg.ctx);
  assertEquals(JSON.parse(avg.calls[0].body!).structuredAggregationQuery.aggregations, [
    { avg: { field: { fieldPath: "amount" } } },
  ]);
});

Deno.test("query-run-aggregation: filters and a collection group reach the nested query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display: DISPLAY });
  await action.execute({
    collectionId: "orders",
    parentPath: "users/alice",
    allDescendants: true,
    filters: '[{"field":"status","op":"==","value":"paid"}]',
  }, ctx);
  const sq = JSON.parse(calls[0].body!).structuredAggregationQuery.structuredQuery;
  assertEquals(sq.from, [{ collectionId: "orders", allDescendants: true }]);
  assertEquals(sq.where.fieldFilter.value, { stringValue: "paid" });
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents/users/alice:runAggregationQuery",
  );
});

Deno.test("query-run-aggregation: sum/avg need a field, and the aggregation must be known", async () => {
  const missingField = mockCtx([], { display: DISPLAY });
  await assertRejects(
    async () => await action.execute({ collectionId: "o", aggregation: "sum" }, missingField.ctx),
    Error,
    "`field`",
  );
  const bad = mockCtx([], { display: DISPLAY });
  await assertRejects(
    async () => await action.execute({ collectionId: "o", aggregation: "median" }, bad.ctx),
    Error,
    "aggregation",
  );
  assertEquals(missingField.calls.length + bad.calls.length, 0);
});
