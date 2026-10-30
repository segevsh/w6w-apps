import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-update.ts";

const display = {};

test("domain-update: false is a real setting and survives", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ domainId: "d_1", openTracking: false, clickTracking: true }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { open_tracking: false, click_tracking: true });
});

test("domain-update: refuses a no-op", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ domainId: "d_1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
