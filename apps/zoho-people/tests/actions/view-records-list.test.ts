import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/view-records-list.ts";

Deno.test("view-records-list: GETs /forms/<view>/records and returns the bare array", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: [{ recordId: "759", "First Name": "John" }] }]);
  const out = await action.execute({
    viewName: "P_EmployeeView",
    sIndex: 1,
    rec_limit: 10,
    searchColumn: "EMPLOYEEMAILALIAS",
    searchValue: "j@x.com",
  }, ctx) as { records: unknown[]; count: number };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/people/api/forms/P_EmployeeView/records");
  assertEquals(url.searchParams.get("rec_limit"), "10");
  assertEquals(url.searchParams.get("searchColumn"), "EMPLOYEEMAILALIAS");
  assertEquals(out.count, 1);
  assertEquals(out.records, [{ recordId: "759", "First Name": "John" }]);
});

Deno.test("view-records-list: invalid view surfaces 7012; bad names never reach the network", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    status: 400,
    body: { response: { errors: { code: 7012, message: "Invalid View Name" }, status: 1 } },
  }]);
  await assertRejects(
    () => action.execute({ viewName: "Nope" }, ctx) as Promise<unknown>,
    Error,
    "7012",
  );
  await assertRejects(
    () => action.execute({ viewName: "a/b" }, ctx) as Promise<unknown>,
    Error,
    "view name",
  );
  assertEquals(calls.length, 1);
});
