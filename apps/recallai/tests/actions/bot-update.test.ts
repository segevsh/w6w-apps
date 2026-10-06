import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bot-update.ts";

Deno.test("bot-update: PATCHes only the fields given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1" } }]);
  const out = await action.execute!({
    id: "b1",
    meetingUrl: "https://zoom.us/j/2",
    joinAt: "2026-10-07T10:00:00Z",
    metadata: { a: "b" },
  }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/bot/b1/");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    meeting_url: "https://zoom.us/j/2",
    join_at: "2026-10-07T10:00:00Z",
    metadata: { a: "b" },
  });
  assertEquals(out, { id: "b1" });
});

Deno.test("bot-update: a dispatched bot is refused with update_bot_failed", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: "update_bot_failed", detail: "Only non-dispatched bots can be updated" },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "b1", botName: "x" }, ctx),
    Error,
    "(update_bot_failed)",
  );
});
