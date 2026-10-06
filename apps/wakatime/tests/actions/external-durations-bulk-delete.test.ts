import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/external-durations-bulk-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("external-durations-bulk-delete: DELETEs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  const out = await action.execute!({ date: "2026-09-01", ids: "x" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/external_durations.bulk",
  );
  assertEquals(calls[0].body, '{"date":"2026-09-01","ids":["x"]}');
  assertEquals(out, { data: {} });
});

Deno.test("external-durations-bulk-delete: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ date: "2026-09-01", ids: "x" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
