import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import reactionUpdate from "../../actions/reaction-update.ts";

Deno.test("reaction-update: patches the reaction", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "message_uid": "m-1" } } }]);
  const out = await reactionUpdate.execute!(
    { "messageUid": "m-1", "reaction": "👍" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/messages/m-1/reactions");
  assertEquals(JSON.parse(calls[0].body!), { "reaction": "👍" });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("reaction-update: refuses an empty path id before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await reactionUpdate.execute!({ "messageUid": "" } as never, ctx);
  }, Error);
  assert(err.message.includes("empty"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("reaction-update: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await reactionUpdate.execute!({ "messageUid": "m-1", "reaction": "👍" } as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
