import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transfer-chat.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transfer-chat: group targets are sent as integers", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await action.execute({
    chatId: "C1",
    targetType: "group",
    targetIds: "0,5",
    ignoreAgentsAvailability: true,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/transfer_chat");
  assertEquals(JSON.parse(calls[0].body!), {
    id: "C1",
    target: { type: "group", ids: [0, 5] },
    ignore_agents_availability: true,
  });
  assertEquals(out, { transferred: true });
});

Deno.test("transfer-chat: agent targets stay strings", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ chatId: "C1", targetType: "agent", targetIds: "a@x.co" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).target, { type: "agent", ids: ["a@x.co"] });
});

Deno.test("transfer-chat: no target transfers within the group", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ chatId: "C1", ignoreRequesterPresence: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "C1", ignore_requester_presence: false });
});

Deno.test("transfer-chat: type and ids must come together", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ chatId: "C", targetType: "group" }, ctx),
    Error,
    "`targetIds` is required",
  );
  await assertRejects(
    async () => await action.execute({ chatId: "C", targetIds: "1" }, ctx),
    Error,
    "`targetType` is required",
  );
  await assertRejects(
    async () => await action.execute({ chatId: "C", targetType: "bot", targetIds: "1" }, ctx),
    Error,
    "must be one of",
  );
  assertEquals(calls.length, 0);
});
