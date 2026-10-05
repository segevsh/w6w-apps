import { assertEquals, assertRejects } from "@std/assert";
import update from "../../actions/data-record-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("data-record-update: PUTs { data } to the record path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec_1" } }]);
  await update.execute({ tableKey: "products", recordId: "rec_1", data: { price: 39.99 } }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/data-tables/products/records/rec_1");
  assertEquals(JSON.parse(calls[0].body!), { data: { price: 39.99 } });
});

Deno.test("data-record-update: an empty data object is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(update.execute({ tableKey: "t", recordId: "r", data: {} }, ctx)),
    Error,
    "data cannot be empty",
  );
  assertEquals(calls.length, 0);
});
