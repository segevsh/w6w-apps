import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import chargeGet from "../../actions/charge-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("charge-get: GET /v1/src1/charges/o%201 with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { charge: {} } }]);
  const out = await chargeGet.execute({ source_id: "src1", oid: "o 1" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/src1/charges/o%201");
  assertEquals(calls[0].body, null);
  assert("charge" in out);
});

test("charge-get: declares type read and every required param", () => {
  assertEquals(chargeGet.type, "read");
  const required = (chargeGet.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["oid", "source_id"]);
});

test("charge-get: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await chargeGet.execute({ source_id: "src1", oid: "o 1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
