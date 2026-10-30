import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import tagCreate from "../../actions/tag-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("tag-create: POSTs {name} to /api/tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, name: "vip" } }]);
  const out = await tagCreate.execute({ name: "vip" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "vip" });
  assertEquals(out, { id: 1, name: "vip" });
});
