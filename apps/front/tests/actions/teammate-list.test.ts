import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/teammate-list.ts";

Deno.test("teammate-list: reads /teammates", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _results: [{ id: "tea_1", is_available: true }] },
  }]);
  assertEquals(await action.execute!({}, ctx), [{ id: "tea_1", is_available: true }]);
  assertEquals(new URL(calls[0].url).pathname, "/teammates");
});

/** Availability is what stops a round-robin assigning to somebody on holiday. */
Deno.test("teammate-list: availability is part of the declared output", () => {
  const keys = (action.output as Array<{ key: string }>).map((o) => o.key);
  assert(keys.includes("is_available"), keys.join(","));
  assert(keys.includes("is_blocked"), keys.join(","));
});
