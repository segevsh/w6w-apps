import { assertEquals } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/employee-get.ts";

const body = {
  response: { result: [{ "759": [{ EmailID: "j@x.com", FirstName: "John" }] }], status: 0 },
};

Deno.test("employee-get: searches the employee form by email by default", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body }]);
  const out = await action.execute({ identifier: "j@x.com" }, ctx) as {
    employee: Record<string, unknown>;
    recordId: string;
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/people/api/forms/employee/getRecords");
  assertEquals(url.searchParams.get("searchColumn"), "EMPLOYEEMAILALIAS");
  assertEquals(url.searchParams.get("searchValue"), "j@x.com");
  assertEquals(out.recordId, "759");
  assertEquals(out.employee.FirstName, "John");
});

Deno.test("employee-get: employeeId type searches EMPLOYEEID; no match gives null", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: { response: { result: [], status: 0 } } }]);
  const out = await action.execute({ identifier: "HRM02", identifierType: "employeeId" }, ctx) as {
    employee: unknown;
    recordId: unknown;
  };
  assertEquals(new URL(calls[0].url).searchParams.get("searchColumn"), "EMPLOYEEID");
  assertEquals(out.employee, null);
  assertEquals(out.recordId, null);
});
