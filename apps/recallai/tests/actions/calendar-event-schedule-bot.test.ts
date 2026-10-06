import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/calendar-event-schedule-bot.ts";

Deno.test("calendar-event-schedule-bot: sends deduplication_key and bot_config", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", bots: [{ bot_id: "b1" }] } }]);
  const out = await action.execute!({
    id: "e1",
    deduplicationKey: "ical-123",
    botName: "Notes",
    transcriptProvider: "recallai_streaming",
  }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v2/calendar-events/e1/bot/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    deduplication_key: "ical-123",
    bot_config: {
      bot_name: "Notes",
      recording_config: { transcript: { provider: { recallai_streaming: {} } } },
    },
  });
  assertEquals(out, { id: "e1", bots: [{ bot_id: "b1" }] });
});

Deno.test("calendar-event-schedule-bot: bot_config is always present and join_at is not offered", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ id: "e1", deduplicationKey: "k" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { deduplication_key: "k", bot_config: {} });
  assertEquals(action.params!.some((p) => p.key === "joinAt"), false);
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), [
    "id",
    "deduplicationKey",
  ]);
});

Deno.test("calendar-event-schedule-bot: a 404 is reported", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { detail: "Not found.", code: "not_found" } }]);
  await assertRejects(
    async () => await action.execute!({ id: "e1", deduplicationKey: "k" }, ctx),
    Error,
    "(not_found)",
  );
});
