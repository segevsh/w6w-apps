import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/subscription-create.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("subscription-create: POSTs customer, plan and optional authorization", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ subscription_code: "SUB_1", email_token: "t" }) }]);
  const out = await action.execute({
    customer: "CUS_1",
    plan: "PLN_1",
    authorization: "AUTH_1",
    startDate: "2026-11-01T00:00:00Z",
  }, ctx);
  assertEquals(out, { subscription_code: "SUB_1", email_token: "t" });
  assertEquals(pathOf(calls[0].url), "/subscription");
  assertEquals(JSON.parse(calls[0].body!), {
    customer: "CUS_1",
    plan: "PLN_1",
    authorization: "AUTH_1",
    start_date: "2026-11-01T00:00:00Z",
  });
});

Deno.test("subscription-create: requires customer and plan", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ customer: "", plan: "P" }, ctx),
    Error,
    "Customer",
  );
  await assertRejects(
    async () => await action.execute({ customer: "C", plan: "" }, ctx),
    Error,
    "Plan code",
  );
  assertEquals(calls.length, 0);
});
