import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-get.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("customer-get: GETs /crm/v2/tenant/{t}/customers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7, name: "Ann" } }], conn);
  const out = await action.execute!({ id: 7 }, ctx) as { name: string };
  assertEquals(calls[0].url, "https://api.servicetitan.io/crm/v2/tenant/42/customers/7");
  assertEquals(out.name, "Ann");
});

Deno.test("customer-get: a ProblemDetails 404 surfaces its title", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { title: "Customer not found", status: 404 },
  }], conn);
  await assertRejects(
    async () => await action.execute!({ id: 9 }, ctx),
    Error,
    "Customer not found",
  );
});

Deno.test("customer-get: a connection with no tenant id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ id: 1 }, ctx), Error, "no tenant id");
  assertEquals(calls.length, 0);
});
