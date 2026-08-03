import { assert, assertEquals, assertRejects } from "@std/assert";
import { INVOCATION_ID, mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

Deno.test("customer-create: POSTs /v2/customers with an idempotency key", async () => {
  const { ctx, calls } = mockCtx([{ body: { customer: { id: "c1" } } }]);
  await action.execute({ givenName: "Ada", familyName: "Lovelace" }, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/customers");
  assertEquals(JSON.parse(calls[0].body!), {
    idempotency_key: INVOCATION_ID,
    given_name: "Ada",
    family_name: "Lovelace",
  });
});

Deno.test("customer-create: parses the address JSON param into a nested object", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    emailAddress: "ada@example.test",
    address: '{"address_line_1":"500 Electric Ave","country":"US"}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).address, {
    address_line_1: "500 Electric Ave",
    country: "US",
  });
});

Deno.test("customer-create: rejects a profile with nothing identifying, before calling Square", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(
    async () => {
      await action.execute({ note: "just a note" }, ctx);
    },
    Error,
    "at least one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("customer-create: any one of the five identifying fields is enough", async () => {
  for (const field of ["givenName", "familyName", "companyName", "emailAddress", "phoneNumber"]) {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    await action.execute({ [field]: "x" }, ctx);
    assertEquals(calls.length, 1, field);
  }
});

Deno.test("customer-create: is declared idempotent even though Square's key is optional here", () => {
  assertEquals(action.idempotent, true);
  assert(action.params?.some((p) => p.key === "idempotencyKey"));
});
