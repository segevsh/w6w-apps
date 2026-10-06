import { assertEquals } from "@std/assert";
import taxList from "../../actions/tax-list.ts";
import { assertRejects, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tax-list: GET /taxes wraps the bare array as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1", name: "IVA", percentage: 19 }] }]);
  const out = await taxList.execute({ start: 0, limit: 5, fields: "x" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/taxes");
  assertEquals(queryOf(calls[0].url), { start: "0", limit: "5", fields: "x" });
  assertEquals(out, { items: [{ id: "1", name: "IVA", percentage: 19 }] });
});

Deno.test("tax-list: a non-array body is an error, not an empty list", async () => {
  const { ctx } = mockCtx([{ body: { message: "odd" } }]);
  await assertRejects(() => taxList.execute({}, ctx), Error, "did not return an array");
});
