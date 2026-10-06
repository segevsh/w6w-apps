import { assertEquals } from "@std/assert";
import action from "../../actions/posting-category-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("posting-category-list: GET /v1/posting-categories; a bare array is wrapped as items, with no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "a" }, { id: "b" }] }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/posting-categories");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.items.length, 2);
});
