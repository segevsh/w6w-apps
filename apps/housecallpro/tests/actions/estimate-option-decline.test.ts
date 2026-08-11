import { assertEquals } from "@std/assert";
import estimateOptionDecline from "../../actions/estimate-option-decline.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("estimate-option-decline: POSTs option_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "declined" } }]);
  await estimateOptionDecline.execute({ optionIds: ["o1"] }, ctx);

  assertEquals(pathOf(calls[0].url), "/estimates/options/decline");
  assertEquals(bodyOf(calls[0]), { option_ids: ["o1"] });
});

Deno.test("estimate-option-decline: has no job-copy output, unlike approve", () => {
  const keys = (estimateOptionDecline.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys, ["status", "last_updated_at"]);
});
