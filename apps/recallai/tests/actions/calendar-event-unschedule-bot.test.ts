import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/calendar-event-unschedule-bot.ts";

Deno.test("calendar-event-unschedule-bot: DELETEs the bot and returns the event", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", bots: [] } }]);
  const out = await action.execute!({ id: "e1" }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v2/calendar-events/e1/bot/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "e1", bots: [] });
});

Deno.test("calendar-event-unschedule-bot: a refusal is reported", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { detail: "Conflict" } }]);
  await assertRejects(async () => await action.execute!({ id: "e1" }, ctx), Error, "HTTP 409");
});
