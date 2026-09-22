import { assertEquals } from "@std/assert";
import jobItemSubItemUpdate from "../../actions/job-item-sub-item-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-sub-item-update: status is how a sub-item is completed", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 6 } }]);
  await jobItemSubItemUpdate.execute({
    jobItemSubItemId: 6,
    jobItemSubItemStatus: '{"id":2,"name":"Complete"}',
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/job_item_sub_items/6");
  assertEquals(bodyOf(calls[0]).jobItemSubItemStatus, { id: 2, name: "Complete" });
});

Deno.test("job-item-sub-item-update: orderId may be 0, which is a real order", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 6 } }]);
  await jobItemSubItemUpdate.execute({ jobItemSubItemId: 6, orderId: 0 }, ctx);
  assertEquals(bodyOf(calls[0]).orderId, 0);
});
