import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/heartbeats-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("heartbeats-list: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ entity: "a.ts" }] } }]);
  const out = await action.execute!({ date: "2026-09-01" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/heartbeats?date=2026-09-01",
  );
  assertEquals(out, { data: [{ entity: "a.ts" }] });
});

Deno.test("heartbeats-list: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ date: "2026-09-01" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
