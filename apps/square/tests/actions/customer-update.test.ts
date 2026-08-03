import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

Deno.test("customer-update: PUTs /v2/customers/{id} with only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: { customer: { id: "c1" } } }]);
  await action.execute({ customerId: "c1", emailAddress: "new@example.test" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/customers/c1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "new@example.test" });
});

Deno.test("customer-update: a blank field is omitted, never sent as an empty string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ customerId: "c1", givenName: "Ada", familyName: "", note: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { given_name: "Ada" });
});

Deno.test("customer-update: passes the optimistic-concurrency version through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ customerId: "c1", note: "x", version: 7 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).version, 7);
});

Deno.test("customer-update: sends no idempotency key — Square's endpoint takes none", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ customerId: "c1", note: "x" }, ctx);
  assertEquals("idempotency_key" in JSON.parse(calls[0].body!), false);
  assertEquals(action.idempotent, false);
});
