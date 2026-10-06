import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/stats-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("stats-get: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { total_seconds: 3600 } } }]);
  const out = await action.execute!({ range: "last_7_days", writesOnly: true }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/stats/last_7_days?writes_only=true",
  );
  assertEquals(out, { data: { total_seconds: 3600 } });
});

Deno.test("stats-get: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ range: "last_7_days", writesOnly: true }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
