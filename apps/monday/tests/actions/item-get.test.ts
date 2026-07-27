import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

Deno.test("item-get: passes a single id as a one-element list", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { items: [{ id: "i1" }] } } }]);
  await action.execute({ itemId: "i1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { ids: ["i1"] });
});

Deno.test("item-get: splits comma-separated ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { items: [] } } }]);
  await action.execute({ itemId: "i1, i2 ,i3" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.ids, ["i1", "i2", "i3"]);
});
