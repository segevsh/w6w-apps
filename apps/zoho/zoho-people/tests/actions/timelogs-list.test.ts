import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/timelogs-list.ts";

Deno.test("timelogs-list: GETs gettimelogs with the date range and filters", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: { response: { result: [{ timelogId: "7", workDate: "04-04-2019" }], status: 0 } },
  }]);
  const out = await action.execute({
    user: "j@x.com",
    fromDate: "2026-09-01",
    toDate: "2026-09-30",
    billingStatus: "billable",
    approvalStatus: "approved",
    sIndex: 0,
    limit: 100,
  }, ctx) as { result: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/people/api/timetracker/gettimelogs");
  assertEquals(url.searchParams.get("user"), "j@x.com");
  assertEquals(url.searchParams.get("fromDate"), "2026-09-01");
  assertEquals(url.searchParams.get("billingStatus"), "billable");
  assertEquals(url.searchParams.get("sIndex"), "0");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(out.result.length, 1);
});

Deno.test("timelogs-list: the one-month-window error (9007) is surfaced", async () => {
  const { ctx } = mockPeopleCtx([{
    status: 400,
    body: {
      response: {
        errors: [{
          code: 9007,
          message: "Maximum of one month's data can only be fetched at a time",
        }],
        status: 1,
      },
    },
  }]);
  await assertRejects(
    () => action.execute({ fromDate: "2026-01-01", toDate: "2026-06-01" }, ctx) as Promise<unknown>,
    Error,
    "9007",
  );
});
