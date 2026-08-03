import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-reactions.ts";

Deno.test("list-reactions: GETs the message's reactions collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { reactions: [] } }]);
  await action.execute!({ space: "A1", message: "B1.B1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages/B1.B1/reactions");
});

Deno.test("list-reactions: passes filter and paging through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    space: "spaces/A1",
    message: "B1",
    filter: 'emoji.unicode = "👍"',
    pageSize: 200,
    pageToken: "tok",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("filter"), 'emoji.unicode = "👍"');
  assertEquals(p.get("pageSize"), "200");
  assertEquals(p.get("pageToken"), "tok");
});

Deno.test("list-reactions: a full message resource name overrides the space field", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "IGNORED", message: "spaces/A9/messages/B9" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A9/messages/B9/reactions");
});
