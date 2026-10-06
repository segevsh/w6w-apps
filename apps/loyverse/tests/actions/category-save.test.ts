import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/category-save.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("category-save: creates with POST and no id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", name: "Drinks", color: "BLUE" } }]);
  await action.execute({ name: "Drinks", color: "BLUE" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1.0/categories");
  assertEquals(JSON.parse(calls[0].body!), { name: "Drinks", color: "BLUE" });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("category-save: an id in the body means update", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute({ id: "c1", name: "Food" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "c1", name: "Food" });
});

Deno.test("category-save: requires a name, and is not marked idempotent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute({ name: " " }, ctx)), Error, "Name");
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});

Deno.test("category-save: surfaces vendor error codes", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("INVALID_VALUE", "bad color") }]);
  const err = await assertRejects(() => Promise.resolve(action.execute({ name: "x" }, ctx)), Error);
  assertEquals(err.message.includes("INVALID_VALUE"), true, err.message);
});
