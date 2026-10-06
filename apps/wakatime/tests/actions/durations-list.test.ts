import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/durations-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("durations-list: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], timezone: "UTC" } }]);
  const out = await action.execute!({ date: "2026-09-01", sliceBy: "language" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/durations?date=2026-09-01&slice_by=language",
  );
  assertEquals(out, { data: [], timezone: "UTC" });
});

Deno.test("durations-list: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ date: "2026-09-01", sliceBy: "language" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
