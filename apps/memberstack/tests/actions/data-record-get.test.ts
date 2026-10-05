import { assertEquals } from "@std/assert";
import get from "../../actions/data-record-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("data-record-get: uses query findUnique with where.id and unwraps the record", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { record: { id: "rec_1" } } } }]);
  const out = await get.execute(
    { tableKey: "products", recordId: "rec_1", include: { category: true } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/data-tables/products/records/query");
  assertEquals(JSON.parse(calls[0].body!), {
    query: { findUnique: { where: { id: "rec_1" }, include: { category: true } } },
  });
  assertEquals(out, { record: { id: "rec_1" } });
});

Deno.test("data-record-get: include is omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { record: { id: "r" } } } }]);
  await get.execute({ tableKey: "t", recordId: "r" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { query: { findUnique: { where: { id: "r" } } } });
});
