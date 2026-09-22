import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import createCustomer from "../../actions/create-customer.ts";
import { envelope, errorBody, mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

const created = envelope("customers", { id: "CU1", email: "a@b.co" });

Deno.test("create-customer: POST /customers with the body wrapped in the plural resource name", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  const out = await createCustomer.execute!({
    email: "a@b.co",
    givenName: "Ada",
    familyName: "Lovelace",
    countryCode: "GB",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/customers");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    customers: {
      email: "a@b.co",
      given_name: "Ada",
      family_name: "Lovelace",
      country_code: "GB",
    },
  });
  assertEquals(out.id, "CU1");
});

Deno.test("create-customer: the client never sets the credential itself", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await createCustomer.execute!({ email: "a@b.co" }, ctx);
  // `sign` stamps authorization and gocardless-version; an Action must not.
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals("gocardless-version" in calls[0].headers, false);
});

Deno.test("create-customer: Idempotency-Key comes from the param when set", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await createCustomer.execute!({ email: "a@b.co", idempotencyKey: "order-1042" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "order-1042");
});

Deno.test("create-customer: Idempotency-Key falls back to the invocation id", async () => {
  const { ctx, calls } = mockCtxWithInvocation(
    [{ body: created }],
    "inv-abcdef",
  );
  await createCustomer.execute!({ email: "a@b.co" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-abcdef");
});

Deno.test("create-customer: a blank key with no invocation sends no header at all", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await createCustomer.execute!({ email: "a@b.co", idempotencyKey: "  " }, ctx);
  assertEquals("idempotency-key" in calls[0].headers, false);
});

Deno.test("create-customer: metadata typed as JSON text is parsed before it is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await createCustomer.execute!({ email: "a@b.co", metadata: '{"order_id":"A-1"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).customers.metadata, { order_id: "A-1" });
});

Deno.test("create-customer: unset fields are absent from the body, not sent as empty", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await createCustomer.execute!({ email: "a@b.co", city: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { customers: { email: "a@b.co" } });
});

Deno.test("create-customer: malformed metadata is refused before any request is made", () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  // `execute` here is synchronous, so the throw happens before any promise
  // exists — the body is built, and validated, before the request is sent.
  assertThrows(
    () => createCustomer.execute!({ email: "a@b.co", metadata: "{" }, ctx),
    Error,
    "Metadata is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-customer: a 403 is reported as the vendor's own reason", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("gocardless", {
      code: 403,
      message: "Forbidden",
      errors: [{ reason: "forbidden", message: "You are not allowed to create customers" }],
    }),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(createCustomer.execute!({ email: "a@b.co" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403 gocardless/forbidden"), true, err.message);
  assertEquals(err.message.includes("POST /customers"), true, err.message);
});
