import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/callback-answer-query.ts";

Deno.test("callback-answer-query: POSTs answerCallbackQuery with the query id", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  assertEquals(await action.execute({ callbackQueryId: "q1" }, ctx), true);
  assertEquals(JSON.parse(calls[0].body!), { callback_query_id: "q1" });
});

Deno.test("callback-answer-query: maps the alert options onto snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  await action.execute(
    { callbackQueryId: "q1", text: "Saved", showAlert: true, cacheTime: 5 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    callback_query_id: "q1",
    text: "Saved",
    show_alert: true,
    cache_time: 5,
  });
});
