import { assertEquals } from "@std/assert";
import jobLineItemList from "../../actions/job-line-item-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-line-item-list: reads the unenveloped {url, data} shape", async () => {
  const { ctx, calls } = mockCtx([
    { body: { url: "/jobs/j1/line_items", data: [{ id: "li1", amount: 9900 }] } },
  ]);
  const out = await jobLineItemList.execute({ jobId: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/jobs/j1/line_items");
  assertEquals(out.items, [{ id: "li1", amount: 9900 }]);
  // No pagination on this endpoint: reporting a page would be inventing one.
  assertEquals(out.page, undefined);
  assertEquals(out.totalItems, undefined);
});

Deno.test("job-line-item-list: an empty body reads as no items, not as a crash", async () => {
  const { ctx } = mockCtx([{ body: { url: "/jobs/j1/line_items" } }]);
  assertEquals((await jobLineItemList.execute({ jobId: "j1" }, ctx)).items, []);
});
