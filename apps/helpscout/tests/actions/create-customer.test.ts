import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-customer.ts";

test("create-customer: POSTs /customers, wrapping email into the emails array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: { "resource-id": "101" } }]);
  const out = await action.execute({
    firstName: "Vernon",
    lastName: "Bear",
    email: "bear@acme.com",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/customers");
  assertEquals(JSON.parse(calls[0].body!), {
    firstName: "Vernon",
    lastName: "Bear",
    emails: [{ type: "work", value: "bear@acme.com" }],
  });
  assertEquals(out, { id: 101 });
});

test("create-customer: organizationId wins over organization name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: {} }]);
  await action.execute({ organizationId: 35, organization: "Acme, Inc" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.organizationId, 35);
  assertEquals("organization" in body, false);
});

test("create-customer: sends no emails array when no email is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: {} }]);
  await action.execute({ firstName: "Vernon" }, ctx);
  assertEquals("emails" in JSON.parse(calls[0].body!), false);
});
