import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/status-bar-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("status-bar-get: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { grand_total: {} } } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/status_bar/today");
  assertEquals(out, { data: { grand_total: {} } });
});

Deno.test("status-bar-get: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
