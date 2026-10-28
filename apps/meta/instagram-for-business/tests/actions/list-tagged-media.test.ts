import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tagged-media.ts";

Deno.test("list-tagged-media: GET /17/tags with the documented query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", data: [] } }]);
  await action.execute!({
    igUserId: "17",
    mediaTypes: ["IMAGE", "VIDEO"],
    postedAfter: "2026-01-01",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/17/tags");
  assertEquals(Object.fromEntries(url.searchParams), {
    fields: "id,username,caption,media_type,media_url,permalink,timestamp",
    media_type: "IMAGE,VIDEO",
    posted_after: "2026-01-01",
    limit: "25",
  });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("list-tagged-media: surfaces a Graph error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad", code: 100 } } }]);
  let msg = "";
  try {
    await action.execute!({
      igUserId: "17",
      mediaTypes: ["IMAGE", "VIDEO"],
      postedAfter: "2026-01-01",
    }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("bad"));
});
