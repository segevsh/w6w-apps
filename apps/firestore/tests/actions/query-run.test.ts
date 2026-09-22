import { assertEquals, assertRejects } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/query-run.ts";

/** `runQuery` answers with a JSON array — the streamed-response mapping. */
const STREAM = [
  {
    document: {
      name: "projects/p1/databases/(default)/documents/cities/sf",
      fields: { name: { stringValue: "San Francisco" }, population: { integerValue: "873965" } },
    },
    readTime: "2026-09-22T00:00:00Z",
  },
  { document: { name: "projects/p1/databases/(default)/documents/cities/nyc", fields: {} } },
  { readTime: "2026-09-22T00:00:01Z" },
];

Deno.test("query-run: POSTs a StructuredQuery to the parent and decodes the stream", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: STREAM }], { display: DISPLAY });

  const result = await action.execute({
    collectionId: "cities",
    filters: '[{"field":"population","op":">","value":1000000}]',
    orderBy: '[{"field":"population","direction":"descending"}]',
    limit: 10,
  }, ctx) as { documents: Array<{ data?: unknown }>; count: number; readTime?: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents:runQuery",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.structuredQuery.from, [{ collectionId: "cities" }]);
  assertEquals(body.structuredQuery.where, {
    fieldFilter: {
      field: { fieldPath: "population" },
      op: "GREATER_THAN",
      value: { integerValue: "1000000" },
    },
  });
  assertEquals(body.structuredQuery.orderBy, [
    { field: { fieldPath: "population" }, direction: "DESCENDING" },
  ]);
  assertEquals(body.structuredQuery.limit, 10);
  // The sentinel element carries no document and is not a result.
  assertEquals(result.count, 2);
  assertEquals(result.documents[0].data, { name: "San Francisco", population: 873965 });
  assertEquals(result.readTime, "2026-09-22T00:00:01Z");
});

Deno.test("query-run: a parentPath scopes a subcollection, allDescendants a collection group", async () => {
  const sub = mockCtx([{ status: 200, body: [] }], { display: DISPLAY });
  await action.execute({ collectionId: "orders", parentPath: "users/alice" }, sub.ctx);
  assertEquals(
    new URL(sub.calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents/users/alice:runQuery",
  );

  const group = mockCtx([{ status: 200, body: [] }], { display: DISPLAY });
  await action.execute({ collectionId: "orders", allDescendants: true }, group.ctx);
  assertEquals(JSON.parse(group.calls[0].body!).structuredQuery.from, [
    { collectionId: "orders", allDescendants: true },
  ]);
});

Deno.test("query-run: `collectionId` is required and a bad limit never reaches the wire", async () => {
  const none = mockCtx([], { display: DISPLAY });
  await assertRejects(async () => await action.execute({}, none.ctx), Error, "collectionId");

  const badLimit = mockCtx([], { display: DISPLAY });
  await assertRejects(
    async () => await action.execute({ collectionId: "cities", limit: -5 }, badLimit.ctx),
    Error,
    "non-negative",
  );
  assertEquals(none.calls.length + badLimit.calls.length, 0);
});
