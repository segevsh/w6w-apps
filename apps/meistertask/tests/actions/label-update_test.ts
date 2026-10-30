import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import labelUpdate from "../../actions/label-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("label-update: PUT /labels/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 25, color: "d93651" } }]);
  const out = await labelUpdate.execute({ id: 25, color: "d93651" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/labels/25");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { color: "d93651" });
  assertEquals(out, { id: 25, color: "d93651" });
});
