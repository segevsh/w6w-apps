import { assertEquals } from "@std/assert";
import itemGet from "../../actions/item-get.ts";
import { alegraError, assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("item-get: GET /items/:id returns the record", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5" } }]);
  const out = await itemGet.execute({ id: "5" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/items/5");
  assertEquals(out, { id: "5" });
});

Deno.test("item-get: a UUID id is path-encoded as a string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await itemGet.execute({ id: "75c1a5ad-4bd5-4675-b51b-8d6c70f1f2f9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/items/75c1a5ad-4bd5-4675-b51b-8d6c70f1f2f9");
});

Deno.test("item-get: a blank id is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => itemGet.execute({ id: " " }, ctx), Error, "id is required");
  assertEquals(calls.length, 0);
});

Deno.test("item-get: a 404 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: alegraError(404, "No encontrado") }]);
  await assertRejects(() => itemGet.execute({ id: "1" }, ctx), Error, "No encontrado");
});
