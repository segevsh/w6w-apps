import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-current.ts";

test("user-current: calls v1's whoami — v2 only has the bulk lookup", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { accountId: "acc1", displayName: "Ann" } }],
    {
      display: { site: "acme" },
    },
  );
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/wiki/rest/api/user/current");
  assertEquals(action.params, []);
  assertEquals(result, { accountId: "acc1", displayName: "Ann" });
});

test("user-current: an OAuth connection reaches it through the gateway", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: { cloudId: "cid" } });
  await action.execute!({}, ctx);
  assertEquals(
    calls[0].url,
    "https://api.atlassian.com/ex/confluence/cid/wiki/rest/api/user/current",
  );
});
