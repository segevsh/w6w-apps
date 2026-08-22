import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alert-channel-get.ts";

Deno.test("alert-channel-get: reads one channel by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, sendRecovery: false } }]);
  const result = await action.execute!({ channelId: "1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/alert-channels/1");
  assertEquals(result.sendRecovery, false);
});

/** A channel that sends failures but not recoveries looks permanently on fire. */
Deno.test("alert-channel-get: surfaces which event kinds a channel actually sends", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "sendRecovery")!.label.includes("as well as failures"));
});

Deno.test("alert-channel-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`channelId`");
  assertEquals(calls.length, 0);
});
