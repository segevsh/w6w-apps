import { assertEquals, assertRejects } from "@std/assert";
import query from "../../actions/data-record-query.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("data-record-query: builds findMany and maps records + pagination", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        records: [{ id: "r1" }],
        pagination: { hasMore: true, limit: 20, endCursor: 12345 },
      },
    },
  }]);
  const out = await query.execute({
    tableKey: "products",
    where: '{"inStock":true}',
    orderBy: { internalOrder: "asc" },
    take: 20,
    after: 100,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/data-tables/products/records/query");
  assertEquals(JSON.parse(calls[0].body!), {
    query: {
      findMany: {
        where: { inStock: true },
        orderBy: { internalOrder: "asc" },
        take: 20,
        after: 100,
      },
    },
  });
  assertEquals(out, { records: [{ id: "r1" }], hasMore: true, endCursor: 12345 });
});

Deno.test("data-record-query: countOnly sends _count:true and reads data._count", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { _count: 42 } } }]);
  const out = await query.execute({ tableKey: "t", countOnly: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { query: { findMany: { _count: true } } });
  assertEquals(out, { records: [], hasMore: false, count: 42 });
});

Deno.test("data-record-query: orderBy accepts an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { records: [] } } }]);
  await query.execute({ tableKey: "t", orderBy: '[{"price":"asc"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).query.findMany.orderBy, [{ price: "asc" }]);
});

Deno.test("data-record-query: documented illegal combinations fail before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(query.execute({ tableKey: "t", include: {}, select: {} }, ctx)),
    Error,
    "include and select",
  );
  await assertRejects(
    () => Promise.resolve(query.execute({ tableKey: "t", skip: 5, after: 1 }, ctx)),
    Error,
    "skip and after",
  );
  assertEquals(calls.length, 0);
});
