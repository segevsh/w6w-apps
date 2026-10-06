import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-goals.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-goals: maps each goal and counts them", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ slug: "a", goal_type: "hustler", safebuf: 1 }, { slug: "b", pledge: 10 }],
  }]);
  const out = await run(action, { username: "alice", emaciated: true }, ctx);
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/alice/goals.json?emaciated=true",
  );
  assertEquals(out.count, 2);
  assertEquals(out.goals[0].slug, "a");
  assertEquals(out.goals[1].pledge, 10);
});

Deno.test("list-goals: a non-array body gives an empty list; errors throw", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals((await run(action, {}, ctx)).count, 0);
  const bad = mockCtx([{ status: 401, body: { errors: { message: "nope" } } }]);
  await assertRejects(() => run(action, {}, bad.ctx), Error, "nope");
});
