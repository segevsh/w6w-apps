import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/heartbeats-bulk-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("heartbeats-bulk-delete: DELETEs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  const out = await action.execute!({ date: "2026-09-01", ids: "a, b" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/heartbeats.bulk");
  assertEquals(calls[0].body, '{"date":"2026-09-01","ids":["a","b"]}');
  assertEquals(out, { data: {} });
});

Deno.test("heartbeats-bulk-delete: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ date: "2026-09-01", ids: "a, b" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
