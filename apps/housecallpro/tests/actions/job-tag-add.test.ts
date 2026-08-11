import { assertEquals } from "@std/assert";
import jobTagAdd from "../../actions/job-tag-add.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-tag-add: POSTs a tag_id, not a tag name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { tags: [{ id: "t1", name: "VIP" }] } }]);
  await jobTagAdd.execute({ jobId: "j1", tagId: "t1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/jobs/j1/tags");
  assertEquals(bodyOf(calls[0]), { tag_id: "t1" });
});

Deno.test("job-tag-add: is idempotent — tagging is set membership", () => {
  assertEquals(jobTagAdd.idempotent, true);
});
