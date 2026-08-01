import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transaction-list.ts";

Deno.test("transaction-list: sends the date range and default pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { transaction_details: [] } }]);
  await action.execute!(
    { startDate: "2026-07-01T00:00:00Z", endDate: "2026-07-15T00:00:00Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/reporting/transactions");
  assertEquals(url.searchParams.get("start_date"), "2026-07-01T00:00:00.000Z");
  assertEquals(url.searchParams.get("end_date"), "2026-07-15T00:00:00.000Z");
  assertEquals(url.searchParams.get("page_size"), "100");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("transaction-list: startDate and endDate are required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ endDate: "2026-07-15T00:00:00Z" }, ctx)),
    Error,
    "`startDate`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("transaction-list: rejects a range over 31 days", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute!(
          { startDate: "2026-01-01T00:00:00Z", endDate: "2026-07-01T00:00:00Z" },
          ctx,
        ),
      ),
    Error,
    "31 days",
  );
  assertEquals(calls.length, 0);
});

Deno.test("transaction-list: rejects endDate before startDate", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute!(
          { startDate: "2026-07-15T00:00:00Z", endDate: "2026-07-01T00:00:00Z" },
          ctx,
        ),
      ),
    Error,
    "before",
  );
  assertEquals(calls.length, 0);
});
