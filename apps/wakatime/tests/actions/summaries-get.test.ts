import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/summaries-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("summaries-get: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], start: "s", end: "e" } }]);
  const out = await action.execute!(
    { start: "2026-09-01", end: "2026-09-07", project: "w6w" },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/summaries?start=2026-09-01&end=2026-09-07&project=w6w",
  );
  assertEquals(out, { data: [], start: "s", end: "e" });
});

Deno.test("summaries-get: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () =>
      await action.execute!({ start: "2026-09-01", end: "2026-09-07", project: "w6w" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});

Deno.test("summaries-get: needs a range or both dates", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ start: "2026-09-01" }, ctx),
    Error,
    "start and an end date",
  );
  assertEquals(calls.length, 0);
});
