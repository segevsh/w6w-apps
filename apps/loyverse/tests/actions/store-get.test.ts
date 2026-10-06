import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/store-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("store-get: GET /stores/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1" } }]);
  const out = await action.execute({ storeId: "x1" }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/stores/{id}".replace("{id}", "x1"));
  assertEquals(out.id, "x1");
});

Deno.test("store-get: a slash in the id cannot leave the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ storeId: "a/../b" }, ctx);
  assertEquals(pathOf(calls[0].url).includes("a%2F..%2Fb"), true);
});

Deno.test("store-get: a missing id is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "required");
  assertEquals(calls.length, 0);
});

Deno.test("store-get: surfaces the vendor error code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("NOT_FOUND", "The resource was not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute({ storeId: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("NOT_FOUND"), true, err.message);
});
