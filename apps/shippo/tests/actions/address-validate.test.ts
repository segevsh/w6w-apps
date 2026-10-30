import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/address-validate.ts";

test("address-validate: reads GET /addresses/{id}/validate", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { object_id: "adr_1", validation_results: { is_valid: true, messages: [] } },
  }]);
  const result = await action.execute!({ addressId: "adr_1" }, ctx) as {
    validation_results?: { is_valid?: boolean };
  };
  assertEquals(calls[0].url, "https://api.goshippo.com/addresses/adr_1/validate");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.validation_results?.is_valid, true);
});

test("address-validate: `addressId` is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "addressId");
  assertEquals(calls.length, 0);
});

test("address-validate: is read-only", () => {
  assertEquals(action.type, "read");
});

test("address-validate: logs the outcome, not the address itself", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { object_id: "adr_1", validation_results: { is_valid: false } },
  }]);
  await action.execute!({ addressId: "adr_1" }, ctx);
  assertEquals(logs[0].data, { addressId: "adr_1", isValid: false });
});
