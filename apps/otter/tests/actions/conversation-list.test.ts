import { assertEquals } from "@std/assert";
import conversationList from "../../actions/conversation-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("conversation-list: fetches GET /conversations with the given filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      meta: { retrieved_at: "2026-09-29T00:00:00Z", has_more: true, next_cursor: "abc" },
      data: [{ id: "conv1", title: "product launch meeting" }],
    },
  }]);

  const out = await conversationList.execute(
    { includeShared: true, channelId: "chan_1", limit: 10, cursor: "prev" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/conversations");
  assertEquals(url.searchParams.get("include_shared"), "true");
  assertEquals(url.searchParams.get("channel_id"), "chan_1");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("cursor"), "prev");
  assertEquals(out.meta.has_more, true);
  assertEquals(out.data[0].id, "conv1");
});

Deno.test("conversation-list: omits unset filters entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { meta: {}, data: [] } }]);
  await conversationList.execute({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});

Deno.test("conversation-list: is a search action, not read", () => {
  assertEquals(conversationList.type, "search");
});
