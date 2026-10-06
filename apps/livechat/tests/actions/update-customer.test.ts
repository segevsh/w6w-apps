import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-customer.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-customer: maps camelCase inputs to the vendor's snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await action.execute({
    customerId: "cust",
    name: "Thomas",
    email: "t@x.co",
    phoneNumber: "+14155550123",
    avatar: "https://x.co/a.png",
    sessionFields: [{ plan: "pro" }],
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/update_customer");
  assertEquals(JSON.parse(calls[0].body!), {
    id: "cust",
    name: "Thomas",
    email: "t@x.co",
    phone_number: "+14155550123",
    avatar: "https://x.co/a.png",
    session_fields: [{ plan: "pro" }],
  });
  assertEquals(out, { updated: true });
});

Deno.test("update-customer: session fields may arrive as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ customerId: "c", sessionFields: '[{"a":"1"},{"b":"2"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).session_fields, [{ a: "1" }, { b: "2" }]);
});

Deno.test("update-customer: needs at least one field besides the id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ customerId: "c" }, ctx),
    Error,
    "at least one of",
  );
  await assertRejects(
    async () => await action.execute({ name: "x" }, ctx),
    Error,
    "`customerId` is required",
  );
  await assertRejects(
    async () => await action.execute({ customerId: "c", sessionFields: "{" }, ctx),
    Error,
    "valid JSON",
  );
  await assertRejects(
    async () => await action.execute({ customerId: "c", sessionFields: { a: 1 } }, ctx),
    Error,
    "JSON array",
  );
  assertEquals(calls.length, 0);
});
