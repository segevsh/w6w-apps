import { assertEquals } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("call-list: hits the account-scoped calls.json and reshapes pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("calls", [{ id: "CAL1" }]) }]);
  const out = await callList.execute({ accountId: "ACC1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/calls.json");
  assertEquals(out.calls, [{ id: "CAL1" }]);
  assertEquals(out.totalRecords, 1);
});

Deno.test("call-list: tags filter uses tags[]=, and explicit dates suppress date_range", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("calls", []) }]);
  await callList.execute(
    {
      accountId: "ACC1",
      tags: "New Client,Sales",
      dateRange: "recent",
      startDate: "2016-10-01",
      endDate: "2016-10-17",
    },
    ctx,
  );
  assertEquals(queryAllOf(calls[0].url, "tags"), ["New Client", "Sales"]);
  const q = queryOf(calls[0].url);
  assertEquals(q.start_date, "2016-10-01");
  assertEquals(q.end_date, "2016-10-17");
  assertEquals("date_range" in q, false);
});

Deno.test("call-list: date_range is sent when no explicit start date is given", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("calls", []) }]);
  await callList.execute({ accountId: "ACC1", dateRange: "last_7_days" }, ctx);
  assertEquals(queryOf(calls[0].url).date_range, "last_7_days");
});

Deno.test("call-list: relative pagination is not exposed as a param", () => {
  const keys = callList.params?.map((p) => p.key) ?? [];
  assertEquals(keys.includes("relativePagination"), false);
  assertEquals(keys.includes("offset"), false);
});
