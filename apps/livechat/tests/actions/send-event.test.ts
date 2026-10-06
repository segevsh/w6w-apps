import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/send-event.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("send-event: wraps text in a message event, visible to all by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { event_id: "E1" } }]);
  const out = await action.execute({ chatId: "C1", text: "hello world" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/send_event");
  assertEquals(JSON.parse(calls[0].body!), {
    chat_id: "C1",
    event: { type: "message", text: "hello world", visibility: "all" },
  });
  assertEquals(out, { eventId: "E1" });
});

Deno.test("send-event: agents visibility makes an internal note", async () => {
  const { ctx, calls } = mockCtx([{ body: { event_id: "E2" } }]);
  await action.execute({ chatId: "C1", text: "note", visibility: "agents" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).event.visibility, "agents");
});

Deno.test("send-event: a full event object replaces text and visibility", async () => {
  const { ctx, calls } = mockCtx([{ body: { event_id: "E3" } }]);
  const event = { type: "system_message", text: "x", system_message_type: "manual_archived" };
  await action.execute({ chatId: "C1", event: JSON.stringify(event), text: "ignored" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "C1", event });
});

Deno.test("send-event: validates before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ text: "x" }, ctx),
    Error,
    "`chatId` is required",
  );
  await assertRejects(
    async () => await action.execute({ chatId: "C" }, ctx),
    Error,
    "`text` is required",
  );
  await assertRejects(
    async () => await action.execute({ chatId: "C", text: "x", visibility: "me" }, ctx),
    Error,
    "must be one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-event: a chat the sender is not in is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { type: "validation", message: "user not in chat" } },
  }]);
  await assertRejects(
    async () => await action.execute({ chatId: "C1", text: "x" }, ctx),
    Error,
    "validation: user not in chat",
  );
});
