import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/customer-save.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-save: maps camelCase params to snake_case wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", name: "Ann" } }]);
  await action.execute({
    name: "Ann",
    email: "ann@example.com",
    phoneNumber: "+15550100",
    postalCode: "12345",
    countryCode: "US",
    customerCode: "A-1",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1.0/customers");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Ann",
    email: "ann@example.com",
    phone_number: "+15550100",
    postal_code: "12345",
    country_code: "US",
    customer_code: "A-1",
  });
});

Deno.test("customer-save: includes id for an update; requires name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "u1", name: "Ann" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).id, "u1");
  await assertRejects(() => Promise.resolve(action.execute({ name: "" }, ctx)), Error, "Name");
  assertEquals(action.idempotent, false);
});
