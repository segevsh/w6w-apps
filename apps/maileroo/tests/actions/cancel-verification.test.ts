import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/cancel-verification.ts";
import { mockCtx, run } from "../_helpers.ts";

test("cancel-verification: POSTs to /cancel and maps the cancelled record", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "vrf_1", status: "cancelled", attempts: 0 } },
  }]);
  const out = await run(action, { verificationId: "vrf_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/verify/verifications/vrf_1/cancel");
  assertEquals([out.id, out.status], ["vrf_1", "cancelled"]);
});

test("cancel-verification: a terminal verification (409) throws", async () => {
  await assertRejects(
    () =>
      run(
        action,
        { verificationId: "vrf_1" },
        mockCtx([{ status: 409, body: { error: { message: "already terminal" } } }]).ctx,
      ),
    Error,
    "already terminal",
  );
});
