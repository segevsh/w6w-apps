import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/tag-thread.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-thread: sends chat_id, thread_id and the case-sensitive tag", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await action.execute({ chatId: "C1", threadId: "T1", tag: "VIP" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/tag_thread");
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "C1", thread_id: "T1", tag: "VIP" });
  assertEquals(out, { tagged: true });
});

Deno.test("tag-thread: all three inputs are required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ threadId: "T", tag: "x" }, ctx),
    Error,
    "`chatId` is required",
  );
  await assertRejects(
    async () => await action.execute({ chatId: "C", tag: "x" }, ctx),
    Error,
    "`threadId` is required",
  );
  await assertRejects(
    async () => await action.execute({ chatId: "C", threadId: "T" }, ctx),
    Error,
    "`tag` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("tag-thread: is idempotent and surfaces a vendor error", async () => {
  assertEquals(action.idempotent, true);
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { type: "not_found", message: "Not found" } },
  }]);
  await assertRejects(
    async () => await action.execute({ chatId: "C", threadId: "T", tag: "x" }, ctx),
    Error,
    "not_found",
  );
});
