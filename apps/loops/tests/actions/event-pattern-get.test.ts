import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-pattern-get.ts";

/** By name, because that is what a workflow knows before it fires one. */
Deno.test("event-pattern-get: looks the pattern up by name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "trial_ended" } }]);
  await action.execute!({ eventName: "trial_ended" }, ctx);
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/event-patterns/by-name/trial_ended");
});

Deno.test("event-pattern-get: an awkward name is encoded, not concatenated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ eventName: "trial ended/now" }, ctx);
  assertEquals(
    calls[0].url,
    "https://app.loops.so/api/v1/event-patterns/by-name/trial%20ended%2Fnow",
  );
});

Deno.test("event-pattern-get: a blank name fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`eventName`");
  assertEquals(calls.length, 0);
  assert(action.description!.includes("whether Loops knows it"), action.description);
});
