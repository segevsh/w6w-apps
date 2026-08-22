import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contract-terminate.ts";

const display = {};

/** Deel models termination as a resource you create, wrapped in `data`. */
Deno.test("contract-terminate: POSTs a termination in the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }], { display });
  await action.execute!({ contractId: "c1", endDate: "2026-09-30", reason: "project ended" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/contracts/c1/terminations");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { end_date: "2026-09-30", reason: "project ended" },
  });
});

Deno.test("contract-terminate: an end date is required, and it is not idempotent", async () => {
  assertEquals(action.idempotent, false);
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ contractId: "c1" }, ctx),
    Error,
    "`endDate`",
  );
  assertEquals(calls.length, 0);
});
