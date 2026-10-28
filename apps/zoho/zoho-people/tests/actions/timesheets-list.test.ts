import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/timesheets-list.ts";

Deno.test("timesheets-list: GETs gettimesheet with filters", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: { response: { result: [{ recordId: "3", timesheetName: "Week 15" }], status: 0 } },
  }]);
  const out = await action.execute({
    user: "all",
    approvalStatus: "pending",
    employeeStatus: "users",
    fromDate: "07-Apr-2019",
    toDate: "13-Apr-2019",
    dateFormat: "dd-MMM-yyyy",
    limit: 1,
  }, ctx) as { result: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/people/api/timetracker/gettimesheet");
  assertEquals(url.searchParams.get("approvalStatus"), "pending");
  assertEquals(url.searchParams.get("employeeStatus"), "users");
  assertEquals(url.searchParams.get("dateFormat"), "dd-MMM-yyyy");
  assertEquals(url.searchParams.get("limit"), "1");
  assertEquals(out.result.length, 1);
});

Deno.test("timesheets-list: requires user", async () => {
  const { ctx, calls } = mockPeopleCtx([]);
  await assertRejects(() => action.execute({ user: "" }, ctx) as Promise<unknown>, Error, "user");
  assert(calls.length === 0);
});
