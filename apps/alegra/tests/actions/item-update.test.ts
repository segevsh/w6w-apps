import { assertEquals } from "@std/assert";
import itemUpdate from "../../actions/item-update.ts";
import { assertRejects, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("item-update: PUT /items/:id sends only the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5" } }]);
  await itemUpdate.execute({ id: "5", price: 0, status: "active", taxIds: "6" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/items/5");
  assertEquals(bodyOf(calls[0]), { price: 0, status: "active", tax: [{ id: "6" }] });
});

Deno.test("item-update: the description warns an inactive item must be reactivated in the call", () => {
  assertEquals(itemUpdate.description!.includes("INACTIVE"), true);
});

Deno.test("item-update: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => itemUpdate.execute({ id: "  " }, ctx), Error, "id is required");
  assertEquals(calls.length, 0);
});
