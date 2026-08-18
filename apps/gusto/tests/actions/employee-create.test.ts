import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/employee-create.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("employee-create: posts to the company's employees collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "e1" } }], conn);
  await action.execute!({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1/employees");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.first_name, "Ada");
  // Self-onboarding keeps the SSN and bank details out of this workflow.
  assertEquals(sent.self_onboarding, true);
});

Deno.test("employee-create: both names are required", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ firstName: "Ada" }, ctx),
    Error,
    "lastName",
  );
  assertEquals(calls.length, 0);
});

/** The record exists but cannot be paid — saying so is the point. */
Deno.test("employee-create: says the person is not yet payable", () => {
  assert(/ONBOARDING|cannot yet be paid/i.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});
