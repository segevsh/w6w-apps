import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-goal.ts";
import { mockCtx, run } from "../_helpers.ts";

const base = { slug: "run", title: "Run", goalType: "hustler", gunits: "km" };

Deno.test("create-goal: POSTs JSON with the unset one of the three as an explicit null", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      slug: "run",
      title: "Run",
      goal_type: "hustler",
      gunits: "km",
      goaldate: null,
      goalval: 100,
      rate: 1,
      runits: "d",
      losedate: 1700000000,
      safebuf: 2,
      pledge: 5,
      limsum: "+1 in 2 days",
      graph_url: "g.png",
      frozen: false,
      queued: false,
      updated_at: 5,
    },
  }]);
  const out = await run(
    action,
    { ...base, goalval: 100, rate: 1, tags: "a, b", dryrun: true },
    ctx,
  );
  assertEquals(calls[0].url, "https://www.beeminder.com/api/v1/users/me/goals.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    slug: "run",
    title: "Run",
    goal_type: "hustler",
    gunits: "km",
    goaldate: null,
    goalval: 100,
    rate: 1,
    tags: ["a", "b"],
    dryrun: true,
  });
  assertEquals(out.slug, "run");
});

Deno.test("create-goal: anything but exactly two of goaldate/goalval/rate throws before a call", async () => {
  const none = mockCtx();
  await assertRejects(() => run(action, { ...base, rate: 1 }, none.ctx), Error, "Exactly two");
  await assertRejects(
    () => run(action, { ...base, rate: 1, goalval: 2, goaldate: 3 }, none.ctx),
    Error,
    "Exactly two",
  );
  assertEquals(none.calls.length, 0);
  const bad = mockCtx([{ status: 406, body: { errors: "slug taken" } }]);
  await assertRejects(
    () => run(action, { ...base, rate: 1, goalval: 0 }, bad.ctx),
    Error,
    "slug taken",
  );
});
