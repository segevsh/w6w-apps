import { assertEquals } from "@std/assert";
import estimateList from "../../actions/estimate-list.ts";
import { mockCtx, optionValues, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("estimate-list: calls GET /estimates and folds the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: page("estimates", [{ id: "e1" }]) }]);
  const out = await estimateList.execute({ customerId: "c1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/estimates");
  assertEquals(queryOf(calls[0].url), { customer_id: "c1" });
  assertEquals(out.items, [{ id: "e1" }]);
});

Deno.test("estimate-list: expand offers only attachments, unlike the job list", () => {
  const values = optionValues(estimateList.params?.find((p) => p.key === "expand"));
  assertEquals(values, ["attachments"]);
});

Deno.test("estimate-list: work status travels bracketed", async () => {
  const { ctx, calls } = mockCtx([{ body: page("estimates", []) }]);
  await estimateList.execute({ workStatus: ["completed"] }, ctx);
  assertEquals(queryAll(calls[0].url, "work_status[]"), ["completed"]);
});
