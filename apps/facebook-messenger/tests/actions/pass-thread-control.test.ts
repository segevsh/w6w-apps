import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pass-thread-control.ts";

Deno.test("pass-thread-control: POST /{page}/pass_thread_control with query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await action.execute!(
    { recipientId: "psid", targetAppId: "263902037430900", metadata: "escalated" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(url.pathname, "/v26.0/me/pass_thread_control");
  assertEquals(JSON.parse(url.searchParams.get("recipient")!), { id: "psid" });
  assertEquals(url.searchParams.get("target_app_id"), "263902037430900");
  assertEquals(url.searchParams.get("metadata"), "escalated");
  assertEquals(out, { success: true });
});

Deno.test("pass-thread-control: recipient and target are required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ recipientId: "", targetAppId: "1" }, ctx),
    Error,
    "recipientId",
  );
  await assertRejects(
    async () => await action.execute!({ recipientId: "p", targetAppId: "" }, ctx),
    Error,
    "targetAppId",
  );
  assertEquals(calls.length, 0);
});
