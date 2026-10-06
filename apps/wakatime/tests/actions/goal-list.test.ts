import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/goal-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("goal-list: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "g1" }] } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/goals");
  assertEquals(out, { data: [{ id: "g1" }] });
});

Deno.test("goal-list: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
