import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-space-member.ts";

test("get-space-member: GETs the member by resource name", async () => {
  const { ctx, calls } = mockCtx([
    { body: { name: "spaces/abc/members/m1", email: "a@b.com", role: "COHOST" } },
  ]);
  const result = await action.execute!({ name: "spaces/abc/members/m1" }, ctx) as Record<string, unknown>;
  assertEquals(result.role, "COHOST");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v2/spaces/abc/members/m1");
});
