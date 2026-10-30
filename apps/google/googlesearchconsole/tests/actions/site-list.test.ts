import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/site-list.ts";

test("site-list: calls the bare sites collection with no params", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { siteEntry: [{ siteUrl: "https://www.example.com/", permissionLevel: "SITE_OWNER" }] },
  }]);
  const out = await action.execute!({}, ctx) as { siteEntry: unknown[] };
  assertEquals(calls[0].url, "https://searchconsole.googleapis.com/webmasters/v3/sites");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.siteEntry.length, 1);
});

test("site-list: an account with no sites gets an empty list, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute!({}, ctx) as { siteEntry: unknown[] };
  assertEquals(out.siteEntry, []);
});
