import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payout-get.ts";

Deno.test("payout-get: fetches the batch by id with the default page size", async () => {
  const { ctx, calls } = mockCtx([{ body: { batch_header: { payout_batch_id: "B-1" } } }]);
  const result = await action.execute!({ payoutBatchId: "B-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/payments/payouts/B-1");
  assertEquals(url.searchParams.get("page_size"), "100");
  assertEquals(result, { batch_header: { payout_batch_id: "B-1" } });
});

Deno.test("payout-get: payoutBatchId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ payoutBatchId: "" }, ctx)),
    Error,
    "`payoutBatchId`",
  );
  assertEquals(calls.length, 0);
});
