import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-publishing-limit.ts";

Deno.test("get-publishing-limit: GET /17/content_publishing_limit with the documented query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", data: [] } }]);
  await action.execute!({ igUserId: "17", since: 100 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/17/content_publishing_limit");
  assertEquals(Object.fromEntries(url.searchParams), {
    fields: "quota_usage,config",
    since: "100",
  });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("get-publishing-limit: surfaces a Graph error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad", code: 100 } } }]);
  let msg = "";
  try {
    await action.execute!({ igUserId: "17", since: 100 }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("bad"));
});
