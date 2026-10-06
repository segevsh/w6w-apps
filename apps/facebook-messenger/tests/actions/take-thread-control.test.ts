import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/take-thread-control.ts";

Deno.test("take-thread-control: POST /{page}/take_thread_control with recipient", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await action.execute!({ recipientId: "psid", pageId: "9" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v26.0/9/take_thread_control");
  assertEquals(JSON.parse(url.searchParams.get("recipient")!), { id: "psid" });
  assertEquals(url.searchParams.has("metadata"), false);
  assertEquals(out, { success: true });
});

Deno.test("take-thread-control: blocked call surfaces Meta's error; recipient required", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "blocked", code: 100 } } }]);
  await assertRejects(
    async () => await action.execute!({ recipientId: "p" }, ctx),
    Error,
    "blocked",
  );
  await assertRejects(
    async () => await action.execute!({ recipientId: "" }, ctx),
    Error,
    "recipientId",
  );
});
