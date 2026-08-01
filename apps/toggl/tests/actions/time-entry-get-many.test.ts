import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-get-many.ts";

Deno.test("time-entry-get-many: GETs /me/time_entries with date filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const result = await action.execute(
    { startDate: "2026-07-01", endDate: "2026-07-31" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/me/time_entries");
  assertEquals(url.searchParams.get("start_date"), "2026-07-01");
  assertEquals(url.searchParams.get("end_date"), "2026-07-31");
  assertEquals(result, [{ id: 1 }]);
});

Deno.test("time-entry-get-many: omits unset filters from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});
