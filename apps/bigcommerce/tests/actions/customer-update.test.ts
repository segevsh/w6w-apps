import { assertEquals, assertRejects } from "@std/assert";
import customerUpdate from "../../actions/customer-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-update: PUTs to the COLLECTION — there is no /v3/customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: 12 }], meta: {} } }]);
  await customerUpdate.execute({ customers: [{ id: 12, company: "Acme" }] }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/customers");
  assertEquals(bodyOf(calls[0]), [{ id: 12, company: "Acme" }]);
});

Deno.test("customer-update: refuses an element with no id, and names the index", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await customerUpdate.execute({ customers: [{ id: 1 }, { company: "Acme" }] }, ctx),
    Error,
    "customer at index 1 has no `id`",
  );
});

Deno.test("customer-update: refuses a bare object and an over-long batch", async () => {
  await assertRejects(
    async () => await customerUpdate.execute({ customers: { id: 1 } }, mockCtx([]).ctx),
    Error,
    "takes a JSON array",
  );
  const eleven = Array.from({ length: 11 }, (_, i) => ({ id: i }));
  await assertRejects(
    async () => await customerUpdate.execute({ customers: eleven }, mockCtx([]).ctx),
    Error,
    "at most 10 customers per call; got 11",
  );
});

Deno.test("customer-update: a repeat of the same partial update is a no-op", () => {
  assertEquals(customerUpdate.idempotent, true);
});
