import { assertEquals } from "@std/assert";
import estimateOptionApprove from "../../actions/estimate-option-approve.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("estimate-option-approve: POSTs option_ids to the collection path", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "approved", copied_on_approval_to_job_id: "j9" } },
  ]);
  const out = await estimateOptionApprove.execute({ optionIds: "o1, o2" }, ctx) as {
    copied_on_approval_to_job_id: string;
  };

  assertEquals(calls[0].method, "POST");
  // No estimate id in the path: options are addressed by their own ids.
  assertEquals(pathOf(calls[0].url), "/estimates/options/approve");
  assertEquals(bodyOf(calls[0]), { option_ids: ["o1", "o2"] });
  assertEquals(out.copied_on_approval_to_job_id, "j9");
});

Deno.test("estimate-option-approve: declares the job it may create as an output", () => {
  const keys = (estimateOptionApprove.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys.includes("copied_on_approval_to_job_id"), true);
});
