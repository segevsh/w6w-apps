import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/record-list.ts";

const body = {
  response: {
    result: [{ "759": [{ FirstName: "John", EmployeeID: "HRM02" }] }, {
      "760": [{ FirstName: "Jane" }],
    }],
    message: "Data fetched successfully",
    status: 0,
  },
};

Deno.test("record-list: sends sIndex/limit/search params and flattens records", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body }]);
  const out = await action.execute({
    formLinkName: "employee",
    sIndex: 1,
    limit: 50,
    searchColumn: "EMPLOYEEID",
    searchValue: "HRM02",
    modifiedtime: 1744977447648,
  }, ctx) as { records: Array<Record<string, unknown>>; count: number };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/people/api/forms/employee/getRecords");
  assertEquals(url.searchParams.get("sIndex"), "1");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("searchColumn"), "EMPLOYEEID");
  assertEquals(url.searchParams.get("searchValue"), "HRM02");
  assertEquals(url.searchParams.get("modifiedtime"), "1744977447648");
  assertEquals(out.count, 2);
  assertEquals(out.records[0], { recordId: "759", FirstName: "John", EmployeeID: "HRM02" });
});

Deno.test("record-list: omits unset params", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body }]);
  await action.execute({ formLinkName: "leave" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("record-list: rejects limit > 200 and searchColumn without value", async () => {
  const { ctx, calls } = mockPeopleCtx([]);
  await assertRejects(
    () => action.execute({ formLinkName: "employee", limit: 201 }, ctx) as Promise<unknown>,
    Error,
    "between 1 and 200",
  );
  await assertRejects(
    () =>
      action.execute({ formLinkName: "employee", searchColumn: "EMPLOYEEID" }, ctx) as Promise<
        unknown
      >,
    Error,
    "searchValue",
  );
  assert(calls.length === 0);
});
