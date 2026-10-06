import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/shortcircuit-goal.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("shortcircuit-goal: POSTs /shortcircuit.json without a body and maps the goal", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "run", pledge: 10, safebuf: 0 } }]);
  const out = await run(action, { username: "alice", slug: "run" }, ctx);
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/alice/goals/run/shortcircuit.json",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(out.pledge, 10);
  assertEquals(action.idempotent, false);
});

Deno.test("shortcircuit-goal: a vendor refusal throws", async () => {
  const bad = mockCtx([{ status: 400, body: { errors: "Can't do that." } }]);
  await assertRejects(() => run(action, { slug: "run" }, bad.ctx), Error, "Can't do that.");
});
