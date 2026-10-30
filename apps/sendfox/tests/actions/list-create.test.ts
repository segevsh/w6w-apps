import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listCreate from "../../actions/list-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("list-create: POSTs the name to /lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2, name: "Newsletter" } }]);
  const out = await listCreate.execute({ name: "Newsletter" }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lists");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { name: "Newsletter" });
  assertEquals(out.id, 2);
});

test("list-create: is not marked idempotent — a retry makes a second list", () => {
  assertEquals(listCreate.idempotent, false);
});
