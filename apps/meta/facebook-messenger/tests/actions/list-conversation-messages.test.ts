import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-conversation-messages.ts";

Deno.test("list-conversation-messages: GET /{id}?fields=messages", async () => {
  const messages = {
    data: [{ id: "m1", created_time: "t" }],
    paging: { next: "https://graph.facebook.com/x" },
  };
  const { ctx, calls } = mockCtx([{ body: { id: "t_1", messages } }]);
  const out = await action.execute!({ conversationId: "t_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v26.0/t_1");
  assertEquals(url.searchParams.get("fields"), "messages");
  assertEquals(out, { id: "t_1", messages });
});

Deno.test("list-conversation-messages: an empty conversation yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: { id: "t_1" } }]);
  assertEquals(await action.execute!({ conversationId: "t_1" }, ctx), {
    id: "t_1",
    messages: { data: [] },
  });
});

Deno.test("list-conversation-messages: pageUrl follows paging.next", async () => {
  const next = "https://graph.facebook.com/v26.0/t_1/messages?after=ABC";
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "m2" }] } }]);
  const out = await action.execute!({ pageUrl: next }, ctx);
  assertEquals(calls[0].url, next);
  assertEquals(out.messages.data[0].id, "m2");
});

Deno.test("list-conversation-messages: a pageUrl on another host is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ pageUrl: "https://evil.example.com/x" }, ctx),
    Error,
    "pageUrl",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-conversation-messages: needs an id or a pageUrl", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "required");
});
