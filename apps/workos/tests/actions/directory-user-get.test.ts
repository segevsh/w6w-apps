import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/directory-user-get.ts";

/**
 * WorkOS maps a customer's own SCIM attributes into `custom_attributes`, and
 * the names are per-directory — what Acme calls `department` their next
 * customer calls `dept`. Surfacing the names makes that visible instead of
 * producing an `undefined` three steps later.
 */
Deno.test("directory-user-get: reports which custom attributes are actually present", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "du_1", custom_attributes: { department: "Engineering", employee_number: "42" } },
  }]);
  const result = await action.execute!({ directoryUserId: "du_1" }, ctx) as {
    customAttributeNames: string[];
  };
  assertEquals(calls[0].url, "https://api.workos.com/directory_users/du_1");
  assertEquals(result.customAttributeNames, ["department", "employee_number"]);
});

Deno.test("directory-user-get: a user with no custom attributes reports an empty list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "du_1" } }]);
  const result = await action.execute!({ directoryUserId: "du_1" }, ctx) as {
    customAttributeNames: string[];
  };
  assertEquals(result.customAttributeNames, []);
});

Deno.test("directory-user-get: needs a directory user id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "directoryUserId");
  assertEquals(calls.length, 0);
});
