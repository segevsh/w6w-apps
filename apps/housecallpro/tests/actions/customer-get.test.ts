import { assertEquals, assertRejects } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { mockCtx, pathOf, queryAll, unauthorizedBody } from "../_helpers.ts";

Deno.test("customer-get: calls GET /customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", addresses: [{ id: "a1" }] } }]);
  const out = await customerGet.execute({ customerId: "c1" }, ctx) as { id: string };

  assertEquals(pathOf(calls[0].url), "/customers/c1");
  assertEquals(out.id, "c1");
});

Deno.test("customer-get: a slash pasted into the id cannot rewrite the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customerGet.execute({ customerId: "c1/../company" }, ctx);
  assertEquals(pathOf(calls[0].url), "/customers/c1%2F..%2Fcompany");
});

Deno.test("customer-get: expand travels as expand[]", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customerGet.execute({ customerId: "c1", expand: "attachments" }, ctx);
  assertEquals(queryAll(calls[0].url, "expand[]"), ["attachments"]);
});

Deno.test("customer-get: a 401 becomes an error naming both possible causes", async () => {
  const { ctx } = mockCtx([{ status: 401, body: unauthorizedBody() }]);
  await assertRejects(
    async () => {
      await customerGet.execute({ customerId: "c1" }, ctx);
    },
    Error,
    "identical body for a missing and for a rejected credential",
  );
});
