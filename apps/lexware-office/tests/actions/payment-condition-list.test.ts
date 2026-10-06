import { assertEquals } from "@std/assert";
import action from "../../actions/payment-condition-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-condition-list: GET /v1/payment-conditions; a bare array is wrapped as items, with no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "a" }, { id: "b" }] }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/payment-conditions");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.items.length, 2);
});
