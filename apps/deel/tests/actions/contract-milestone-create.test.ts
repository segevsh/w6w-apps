import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contract-milestone-create.ts";

const display = {};

Deno.test("contract-milestone-create: posts title and amount in the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "m1" } } }], { display });
  await action.execute!({ contractId: "c1", title: "Phase 1", amount: 2500 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/contracts/c1/milestones");
  assertEquals(JSON.parse(calls[0].body!), { data: { title: "Phase 1", amount: 2500 } });
});

Deno.test("contract-milestone-create: an amount of 0 is still an amount", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display });
  await action.execute!({ contractId: "c1", title: "Free", amount: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data.amount, 0);
});

Deno.test("contract-milestone-create: title and amount are required", async () => {
  const noTitle = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ contractId: "c1", amount: 1 }, noTitle.ctx),
    Error,
    "`title`",
  );
  const noAmount = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ contractId: "c1", title: "x" }, noAmount.ctx),
    Error,
    "`amount`",
  );
  assertEquals(noTitle.calls.length + noAmount.calls.length, 0);
});
