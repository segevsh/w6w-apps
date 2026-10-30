import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/get-current-user.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

test("get-current-user: GETs /v4/users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1, name: "Ada" } } }]);
  const out = await exec(action, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/v4/users/me`);
  assertEquals(out, { data: { id: 1, name: "Ada" } });
});

test("get-current-user: a 401 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      errors: [{ type: "General", message: "Authentication failed", details: null, path: null }],
    },
  }]);
  const e = await assertRejects(() => exec(action, {}, ctx), Error);
  assert(String(e).includes("Authentication failed") && String(e).includes("401"));
});
