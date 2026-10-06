import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/ratchet-goal.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("ratchet-goal: form-posts newsafety and maps the goal", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "run", safebuf: 2 } }]);
  const out = await run(action, { slug: "run", newsafety: 2 }, ctx);
  assertEquals(calls[0].url, "https://www.beeminder.com/api/v1/users/me/goals/run/ratchet.json");
  assertEquals(calls[0].body, "newsafety=2");
  assertEquals(out.safeDays, 2);
});

Deno.test("ratchet-goal: zero needs beemergency, which is sent as true", async () => {
  const none = mockCtx();
  await assertRejects(
    () => run(action, { slug: "g", newsafety: 0 }, none.ctx),
    Error,
    "beemergency",
  );
  await assertRejects(() => run(action, { slug: "g" }, none.ctx), Error, "newsafety is required");
  assertEquals(none.calls.length, 0);
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await run(action, { slug: "g", newsafety: 0, beemergency: true }, ctx);
  assertEquals(calls[0].body, "newsafety=0&beemergency=true");
});

Deno.test("ratchet-goal: a vendor refusal throws", async () => {
  const bad = mockCtx([{ status: 406, body: { errors: "newsafety cannot exceed 5" } }]);
  await assertRejects(() => run(action, { slug: "g", newsafety: 9 }, bad.ctx), Error, "exceed 5");
});
