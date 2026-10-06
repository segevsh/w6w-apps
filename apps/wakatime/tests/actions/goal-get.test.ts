import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/goal-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("goal-get: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "g1" } } }]);
  const out = await action.execute!({ goalId: "g1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/goals/g1");
  assertEquals(out, { data: { id: "g1" } });
});

Deno.test("goal-get: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ goalId: "g1" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
