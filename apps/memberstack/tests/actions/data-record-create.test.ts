import { assertEquals, assertRejects } from "@std/assert";
import create from "../../actions/data-record-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("data-record-create: POSTs { data, memberId } to the records path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec_1", tableKey: "products" } }]);
  const out = await create.execute(
    { tableKey: "products", data: { name: "W", price: 29.99 }, memberId: "mem_1" },
    ctx,
  ) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/data-tables/products/records");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { name: "W", price: 29.99 },
    memberId: "mem_1",
  });
  assertEquals(out.id, "rec_1");
});

Deno.test("data-record-create: memberId is omitted when unset; data is required", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec_1" } }]);
  await create.execute({ tableKey: "t", data: '{"a":1}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { data: { a: 1 } });
  await assertRejects(
    () => Promise.resolve(create.execute({ tableKey: "t", data: undefined }, ctx)),
    Error,
    "data is required",
  );
});
