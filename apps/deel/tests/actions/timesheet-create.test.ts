import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/timesheet-create.ts";

const display = {};

Deno.test("timesheet-create: logs work in the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }], { display });
  await action.execute!({ contractId: "c1", quantity: 7.5, description: "sprint work" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/timesheets");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { contract_id: "c1", quantity: 7.5, description: "sprint work" },
  });
});

Deno.test("timesheet-create: a quantity is required and it is not idempotent", async () => {
  assertEquals(action.idempotent, false);
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ contractId: "c1" }, ctx),
    Error,
    "`quantity`",
  );
  assertEquals(calls.length, 0);
});
