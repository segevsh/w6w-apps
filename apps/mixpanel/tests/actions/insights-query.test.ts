import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/insights-query.ts";

const conn = { display: { projectId: "123", region: "us" } };

Deno.test("insights-query: queries a saved report by bookmark id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { series: {} } }], conn);
  await action.execute!({ bookmarkId: "999" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "mixpanel.com");
  assertEquals(url.pathname, "/api/query/insights");
  assertEquals(url.searchParams.get("bookmark_id"), "999");
});

Deno.test("insights-query: a missing report id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "bookmarkId");
});

/** It is the recommended replacement for the maintenance-mode funnels API. */
Deno.test("insights-query: explains why a saved report beats re-deriving", () => {
  assert(/dashboard shows/.test(action.description!), action.description);
});
