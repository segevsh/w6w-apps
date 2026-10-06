import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/leaderboard-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("leaderboard-list: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/leaderboards");
  assertEquals(out, { data: [] });
});

Deno.test("leaderboard-list: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
