import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/start-chat.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("start-chat: builds users, access and the first message", async () => {
  const { ctx, calls } = mockCtx([{
    body: { chat_id: "C1", thread_id: "T1", event_ids: ["E1"] },
  }]);
  const out = await action.execute({
    customerId: "cust",
    agentIds: "a@x.co,b@x.co",
    text: "Hello",
    groupId: 0,
    active: true,
    continuous: false,
    properties: { routing: { pinned: true } },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/start_chat");
  assertEquals(JSON.parse(calls[0].body!), {
    chat: {
      users: [
        { id: "cust", type: "customer" },
        { id: "a@x.co", type: "agent" },
        { id: "b@x.co", type: "agent" },
      ],
      access: { group_ids: [0] },
      properties: { routing: { pinned: true } },
      thread: { events: [{ type: "message", text: "Hello", visibility: "all" }] },
    },
    active: true,
    continuous: false,
  });
  assertEquals(out, { chatId: "C1", threadId: "T1", eventIds: ["E1"] });
});

Deno.test("start-chat: no input is a bare start_chat call; missing event_ids becomes []", async () => {
  const { ctx, calls } = mockCtx([{ body: { chat_id: "C1", thread_id: "T1" } }]);
  const out = await action.execute({}, ctx) as { eventIds: unknown[] };
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out.eventIds, []);
});

Deno.test("start-chat: refuses more than 4 additional agents before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ agentIds: "a,b,c,d,e" }, ctx),
    Error,
    "at most 4",
  );
  assertEquals(calls.length, 0);
});

Deno.test("start-chat: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
