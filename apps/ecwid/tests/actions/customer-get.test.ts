import { assertEquals } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-get: calls GET /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 177737165, email: "buyer@example.com" } }]);
  const out = await customerGet.execute({ customerId: "177737165" }, ctx) as { email: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/customers/177737165");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.email, "buyer@example.com");
});

Deno.test("customer-get: responseFields narrows the read when asked", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customerGet.execute({ customerId: "1", responseFields: "id,email" }, ctx);
  assertEquals(queryOf(calls[0].url), { responseFields: "id,email" });
});

Deno.test("customer-get: the id is required", () => {
  assertEquals(customerGet.params?.find((p) => p.key === "customerId")?.required, true);
});
