import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/card-create.ts";

test("card-create: POSTs /cards with the target list", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute({ idList: "l1", name: "Fix bug" }, ctx);
  assertEquals(calls[0].method, "POST");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/1/cards");
  assertEquals(q.get("idList"), "l1");
  assertEquals(q.get("name"), "Fix bug");
});

test("card-create: drops the blank optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ idList: "l1", name: "x", desc: "", due: "" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.has("desc"), false);
  assertEquals(q.has("due"), false);
});
