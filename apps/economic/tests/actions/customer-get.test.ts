import { assertEquals } from "@std/assert";
import action from "../../actions/customer-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("customer-get: GETs /customers/{id} and wraps the object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const out = await action.execute!({ customerNumber: "A/1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/customers/A%2F1");
  assertEquals(out, { customer: { id: 1 } });
});

Deno.test("customer-get: a 404 is thrown with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "not found", errorCode: "E06000" } }]);
  let msg = "";
  try {
    await action.execute!({ customerNumber: 9 }, ctx);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg.includes("not found (E06000)"), true);
});
