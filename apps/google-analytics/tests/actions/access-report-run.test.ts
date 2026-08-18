import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/access-report-run.ts";

const display = { propertyId: "123" };

/** The one report that lives on the Admin API rather than the Data API. */
Deno.test("access-report-run: goes to the Admin host, not the Data host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { rows: [] } }], { display });
  await action.execute!({}, ctx);
  assertEquals(
    calls[0].url,
    "https://analyticsadmin.googleapis.com/v1beta/properties/123:runAccessReport",
  );
});

Deno.test("access-report-run: defaults to the access vocabulary, not the reporting one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({}, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.dimensions, [{ name: "accessDate" }, { name: "userEmail" }]);
  assertEquals(body.metrics, [{ name: "accessCount" }]);
  assertEquals(body.dateRanges, [{ startDate: "7daysAgo", endDate: "yesterday" }]);
});

Deno.test("access-report-run: the audit flags are only sent when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ includeAllUsers: true, expandGroups: true, limit: 10 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.includeAllUsers, true);
  assertEquals(body.expandGroups, true);
  assertEquals(body.limit, "10");
});
