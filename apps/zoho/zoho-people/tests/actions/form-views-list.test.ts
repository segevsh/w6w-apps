import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/form-views-list.ts";

Deno.test("form-views-list: GETs the form's views", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: { response: { result: [{ viewName: "P_EmployeeView" }], status: 0 } },
  }]);
  const out = await action.execute({ formLinkName: "employee" }, ctx) as { result: unknown };
  assertEquals(new URL(calls[0].url).pathname, "/people/api/forms/employee/views");
  assertEquals(out.result, [{ viewName: "P_EmployeeView" }]);
});

Deno.test("form-views-list: an invalid form surfaces code 7011", async () => {
  const { ctx } = mockPeopleCtx([{
    status: 400,
    body: { response: { errors: { code: 7011, message: "Form name 'x' is invalid" }, status: 1 } },
  }]);
  await assertRejects(
    () => action.execute({ formLinkName: "x" }, ctx) as Promise<unknown>,
    Error,
    "7011",
  );
});
