import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import messageStatusHistory from "../../actions/message-status-history.ts";

Deno.test("message-status-history: gets the history", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": [] } }]);
  const out = await messageStatusHistory.execute!({ "messageUid": "m-1" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://app.timelines.ai/integrations/api/messages/m-1/status_history",
  );
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("message-status-history: refuses an empty path id before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await messageStatusHistory.execute!({ "messageUid": "" } as never, ctx);
  }, Error);
  assert(err.message.includes("empty"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("message-status-history: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await messageStatusHistory.execute!({ "messageUid": "m-1" } as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
