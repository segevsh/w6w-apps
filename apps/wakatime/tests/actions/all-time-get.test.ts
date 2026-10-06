import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/all-time-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("all-time-get: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { total_seconds: 9 } } }]);
  const out = await action.execute!({ project: "w6w" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/all_time_since_today?project=w6w",
  );
  assertEquals(out, { data: { total_seconds: 9 } });
});

Deno.test("all-time-get: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ project: "w6w" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
