import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-charge.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("create-charge: form-posts user_id, amount, note and the dry-run flag", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "c1", amount: 10, note: "oops", username: "alice" },
  }]);
  const out = await run(action, { username: "alice", amount: 10, note: "oops", dryrun: true }, ctx);
  assertEquals(calls[0].url, "https://www.beeminder.com/api/v1/charges.json");
  assertEquals(calls[0].body, "user_id=alice&amount=10&note=oops&dryrun=true");
  assertEquals(out, { id: "c1", amount: 10, note: "oops", username: "alice" });
});

Deno.test("create-charge: under a dollar or no user throws before a call; errors surface", async () => {
  const none = mockCtx();
  await assertRejects(
    () => run(action, { username: "a", amount: 0.5 }, none.ctx),
    Error,
    "at least 1.00",
  );
  await assertRejects(() => run(action, { amount: 5 }, none.ctx), Error, "username is required");
  assertEquals(none.calls.length, 0);
  const bad = mockCtx([{ status: 400, body: { errors: "no card on file" } }]);
  await assertRejects(() => run(action, { username: "a", amount: 5 }, bad.ctx), Error, "no card");
});
