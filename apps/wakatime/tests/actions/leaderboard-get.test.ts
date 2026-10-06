import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/leaderboard-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("leaderboard-get: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], page: 1 } }]);
  const out = await action.execute!({ boardId: "b1", boardType: "ai" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/leaderboards/b1?board_type=ai",
  );
  assertEquals(out, { data: [], page: 1 });
});

Deno.test("leaderboard-get: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ boardId: "b1", boardType: "ai" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
