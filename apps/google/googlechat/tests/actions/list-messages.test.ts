import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-messages.ts";

Deno.test("list-messages: GETs spaces/{space}/messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: [] } }]);
  await action.execute!({ space: "A1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages");
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
});

Deno.test("list-messages: passes every documented query parameter through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    space: "spaces/A1",
    filter: 'create_time > "2026-01-01T00:00:00+00:00"',
    orderBy: "DESC",
    showDeleted: true,
    markupSyntax: "MARKUP_SYNTAX_CHAT",
    pageSize: 100,
    pageToken: "tok",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("filter"), 'create_time > "2026-01-01T00:00:00+00:00"');
  assertEquals(p.get("orderBy"), "DESC");
  assertEquals(p.get("showDeleted"), "true");
  assertEquals(p.get("markupSyntax"), "MARKUP_SYNTAX_CHAT");
  assertEquals(p.get("pageSize"), "100");
  assertEquals(p.get("pageToken"), "tok");
});

Deno.test("list-messages: showDeleted=false is sent, not dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", showDeleted: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("showDeleted"), "false");
});
