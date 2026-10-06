import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import getThread from "../../actions/get-message-thread.ts";

Deno.test("get-message-thread: GET /v2/messaging/{uuid}, escaping the id", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ thread_uid: "u" }] }]);
  const out = await getThread.execute(
    { threadId: "0b9c1d6e-0000-4000-8000-000000000000" },
    ctx,
  ) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/v2/messaging/0b9c1d6e-0000-4000-8000-000000000000");
  assertEquals(out.items.length, 1);
  const bad = mockCtx([{ body: [] }]);
  await getThread.execute({ threadId: "a/b" }, bad.ctx);
  assertEquals(pathOf(bad.calls[0].url), "/v2/messaging/a%2Fb");
});
