import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-customer.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-customer: sends id and wraps the record", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cust", type: "customer", name: "Thomas" } }]);
  const out = await action.execute({ customerId: "cust" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/agent/action/get_customer");
  assertEquals(JSON.parse(calls[0].body!), { id: "cust" });
  assertEquals(out, { customer: { id: "cust", type: "customer", name: "Thomas" } });
});

Deno.test("get-customer: requires customerId; a scope error is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { type: "authorization", message: "scope" } },
  }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`customerId` is required");
  await assertRejects(
    async () => await action.execute({ customerId: "c" }, ctx),
    Error,
    "authorization",
  );
});
