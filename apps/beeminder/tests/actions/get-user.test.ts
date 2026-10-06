import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-user.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-user: defaults to me and maps the user", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      username: "alice",
      timezone: "UTC",
      updated_at: 9,
      goals: ["run"],
      deadbeat: false,
      urgency_load: 3,
    },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://www.beeminder.com/api/v1/users/me.json");
  assertEquals(out.username, "alice");
  assertEquals(out.goals, ["run"]);
  assertEquals(out.urgencyLoad, 3);
});

Deno.test("get-user: passes diff_since / skinny / counts; a 401 throws", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await run(action, { username: "bob", diffSince: 5, skinny: true, datapointsCount: 2 }, ctx);
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/bob.json?diff_since=5&skinny=true&datapoints_count=2",
  );
  const bad = mockCtx([{ status: 401, body: { errors: { message: "No such auth_token" } } }]);
  await assertRejects(() => run(action, {}, bad.ctx), Error, "No such auth_token");
});
