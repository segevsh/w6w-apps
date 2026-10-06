import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-goal.ts";
import { mockCtx, run } from "../_helpers.ts";

const GOAL = {
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
};

Deno.test("get-goal: reads the goal and maps the fields", async () => {
  const { ctx, calls } = mockCtx([{ body: GOAL }]);
  const out = await run(action, { slug: "run", datapoints: true }, ctx);
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/me/goals/run.json?datapoints=true",
  );
  assertEquals(out.goalType, "hustler");
  assertEquals(out.safeDays, 2);
  assertEquals(out.goalValue, 100);
  assertEquals(out.goal, GOAL);
});

Deno.test("get-goal: a missing slug throws; a 404 surfaces the vendor message", async () => {
  await assertRejects(() => run(action, {}, mockCtx().ctx), Error, "slug is required");
  const bad = mockCtx([{ status: 404, body: { errors: "Couldn't find goal" } }]);
  await assertRejects(() => run(action, { slug: "x" }, bad.ctx), Error, "Couldn't find goal");
});
