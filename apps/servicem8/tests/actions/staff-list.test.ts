import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import staffList from "../../actions/staff-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("staff-list: calls GET /staff.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "s1", first: "Jo" }] }]);
  const out = await staffList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/staff.json");
  assertEquals(out.items, [{ uuid: "s1", first: "Jo" }]);
});
