import { assert, assertEquals } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-create: POST /v1/src1/customers with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { customer: {} } }]);
  const out = await customerCreate.execute({
    source_id: "src1",
    oid: "o 1",
    name: "x1",
    email: "x1",
    notes: "x1",
    created: 5,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/src1/customers");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    oid: "o 1",
    name: "x1",
    email: "x1",
    notes: "x1",
    created: 5,
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert("customer" in out);
});

Deno.test("customer-create: omits unset optional body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customerCreate.execute({ source_id: "src1", oid: "o 1" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body ?? "{}")).sort(), ["oid"].sort());
});

Deno.test("customer-create: declares type perform and every required param", () => {
  assertEquals(customerCreate.type, "perform");
  const required = (customerCreate.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["oid", "source_id"]);
});

Deno.test("customer-create: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await customerCreate.execute({
      source_id: "src1",
      oid: "o 1",
      name: "x1",
      email: "x1",
      notes: "x1",
      created: 5,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
