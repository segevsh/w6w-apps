import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/form-fields-get.ts";

Deno.test("form-fields-get: GETs the form's components", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: { response: { result: [{ displayname: "Email" }], status: 0 } },
  }]);
  const out = await action.execute({ formLinkName: "employee" }, ctx) as { result: unknown };
  assertEquals(new URL(calls[0].url).pathname, "/people/api/forms/employee/components");
  assertEquals(out.result, [{ displayname: "Email" }]);
});

Deno.test("form-fields-get: refuses a form name that would escape the path", async () => {
  const { ctx, calls } = mockPeopleCtx([]);
  await assertRejects(
    () => action.execute({ formLinkName: "../x" }, ctx) as Promise<unknown>,
    Error,
    "form link name",
  );
  assertEquals(calls.length, 0);
});
