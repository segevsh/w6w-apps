import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-account-insights.ts";

Deno.test("get-account-insights: GET /17/insights with the documented query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", data: [] } }]);
  await action.execute!({ igUserId: "17", metric: ["reach", "views"], since: "5" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/17/insights");
  assertEquals(Object.fromEntries(url.searchParams), {
    metric: "reach,views",
    period: "day",
    metric_type: "total_value",
    since: "5",
  });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("get-account-insights: surfaces a Graph error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad", code: 100 } } }]);
  let msg = "";
  try {
    await action.execute!({ igUserId: "17", metric: ["reach", "views"], since: "5" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("bad"));
});
