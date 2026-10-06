import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/bot-delete-media.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("bot-delete-media: POSTs /delete_media/ with no body and returns the bot", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "b1", status_changes: [] } }]);
  const out = await action.execute!({ id: "b1" }, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/bot/b1/delete_media/");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "b1", status_changes: [] });
  assertEquals(action.idempotent, false);
});

Deno.test("bot-delete-media: a refusal is reported by Recall's code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { code: "cannot_command_completed_bot", detail: "Cannot send a command" },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "b1" }, ctx),
    Error,
    "(cannot_command_completed_bot)",
  );
});
