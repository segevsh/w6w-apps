import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usergroup-get-many.ts";

test("usergroup-get-many: GETs /usergroups.list with forwarded flags", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, usergroups: [{ id: "S1" }] } }]);
  const result = await action.execute!({ includeUsers: true, includeCount: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/usergroups.list");
  assertEquals(url.searchParams.get("include_users"), "true");
  assertEquals(url.searchParams.get("include_count"), "true");
  assertEquals(result, [{ id: "S1" }]);
});
