import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-list.ts";

const conn = { display: { projectId: "123", region: "us" } };

/** distinct_ids is a JSON array inside a query parameter. */
Deno.test("activity-list: encodes the ids as a JSON array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: { events: [] } } }], conn);
  await action.execute!(
    { distinctIds: "u1, u2", fromDate: "2026-08-01", toDate: "2026-08-18" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/query/stream/query");
  assertEquals(url.searchParams.get("distinct_ids"), '["u1","u2"]');
});

Deno.test("activity-list: ids and dates are required", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ fromDate: "2026-08-01", toDate: "2026-08-18" }, ctx),
    Error,
    "distinctIds",
  );
  assertEquals(calls.length, 0);
});
