import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customers-create.ts";

const sample = { id: 99, object: "customer", first_name: "Ada" };

Deno.test("customers-create: posts the documented body to /customers", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: sample }]);
  const result = await action.execute!({
    first_name: "Ada",
    last_name: "Lovelace",
    referral_code: "GYM10",
    venue: 3,
    field_values: [{ field: 7, value: "gold" }],
    providerId: 5,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/customers");
  assertEquals(calls[0].headers["teamup-provider-id"], "5");
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Ada",
    last_name: "Lovelace",
    referral_code: "GYM10",
    venue: 3,
    field_values: [{ field: 7, value: "gold" }],
  });
  assertEquals(result.id, 99);
});

Deno.test("customers-create: omits unset body fields instead of sending nulls", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: sample }]);
  await action.execute!({ first_name: "Ada", last_name: "Lovelace" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["first_name", "last_name"]);
});

Deno.test("customers-create: is a non-idempotent perform with two required fields", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  for (const key of ["first_name", "last_name"]) {
    assertEquals(action.params!.find((p) => p.key === key)!.required, true, key);
  }
});
