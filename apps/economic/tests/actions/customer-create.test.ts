import { assertEquals } from "@std/assert";
import action from "../../actions/customer-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("customer-create: POSTs references as {xNumber} objects and omits unset fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { customerNumber: 42, name: "Acme" } }]);
  const out = await action.execute!({
    name: "Acme",
    currency: "DKK",
    customerGroupNumber: 1,
    paymentTermsNumber: 2,
    vatZoneNumber: 3,
    email: "a@b.dk",
    salesPersonNumber: 5,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/customers");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Acme",
    currency: "DKK",
    customerGroup: { customerGroupNumber: 1 },
    paymentTerms: { paymentTermsNumber: 2 },
    vatZone: { vatZoneNumber: 3 },
    email: "a@b.dk",
    salesPerson: { employeeNumber: 5 },
  });
  assertEquals(out, { customerNumber: 42, customer: { customerNumber: 42, name: "Acme" } });
  assertEquals(action.idempotent, false);
});

Deno.test("customer-create: flattens the annotated validation errors into the message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      message: "Validation error.",
      httpStatusCode: 400,
      errors: {
        currency: { errors: [{ errorCode: "E06000", message: "currency does not exist." }] },
      },
    },
  }]);
  let msg = "";
  try {
    await action.execute!({
      name: "A",
      currency: "ZUL",
      customerGroupNumber: 1,
      paymentTermsNumber: 1,
      vatZoneNumber: 1,
    }, ctx);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg.includes("currency: currency does not exist. (E06000)"), true);
});
