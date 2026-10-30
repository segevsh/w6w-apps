import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/role-list.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

test("role-list: can look a role up by name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { roles: [], total: 0 } }], conn);
  await action.execute!({ nameFilter: "admin" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("name_filter"), "admin");
});
